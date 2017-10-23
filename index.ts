import * as fs from "fs";
import {exec} from "child_process";
var Viz: (string)=>string = require('viz.js')

const themes = {
    light: ["bisque", "bisque4", "lightcyan2", "lightcyan3", "grey20", "white", "deepskyblue4"],
    dark: ["\"#302315\"", "bisque", "darkslategray", "lightcyan4", "grey90", "grey12", "aquamarine"]
}

var colors = themes.dark;

interface Nestable {
    parent: Group;
    in(parent: Group);
    render(pad: string): string;
}

abstract class Element {
    id: string;
    constructor(prefix?: string, name?: string) {
        this.id = prefix+"_"+String(100+Element.counter++);
    }
    private static counter : number = 0;
    abstract render(pad: string): string;
}

abstract class Node extends Element implements Nestable {
    isMultiple: boolean;
    parent: Group;
    constructor(prefix:string) {
        super(prefix);
    }
    abstract in(parent: Group);
}

abstract class Container extends Element {
    nodes: Nestable[] = [];
    add(node: Nestable) {
        this.nodes.push(node);
    }
    renderContent(pad: string): string {
        return this.nodes.map(node => node.render(pad)).join("");
    }
}

export class Group extends Container implements Nestable {
    parent: Group;
    name: string;
    render(pad: string) {
        var style = name ?
            `name="${name}", color=${colors[1]}` :
            'name="", color=invis'
        return pad+"subgraph cluster_"+this.id+" {\n"+
        pad+' graph [ '+style+' ];\n'+
        this.renderContent(pad+" ")+
        pad+"}\n";
    }
    constructor(name?: string) {
        super("group");
        this.name = name;
    }
    in(parent: Container): Group {
        parent.add(this);
        return this;
    }
    add(node: Nestable) {
        console.log('added', node);
        super.add(node);
        node.parent = this;
    }
}

class System extends Container {
    name: string;
    allLinks: Link[] = [];
    processors: (()=>string)[];
    constructor(name: string) {
        super();
        this.name = name;
    }
    private addNode(node: Nestable) {
        if(node instanceof Instance && node.host) {
            this.addNode(node.host);
        } else if(node.parent) {
            this.addNode(node.parent);
        } else {
            this.add(node);
        }
    }
    is(...links: Link[]) {
        links.forEach( link => {
            link.chain.forEach( link => {
                this.addNode(link.source);
                this.addNode(link.target);
                this.allLinks.push(link)
            });
        });
        return this;
    }
    only(...processors: (()=>string)[]): System {
        this.processors = processors;
        return this;
    }
    render(pad: string) {
        return "digraph {\n"+
            ` graph [ tooltip = " ", fontname = helvetica, nodesep = 0.5, label = <${this.name}<BR/><BR/><BR/>>, labelloc=top, fontcolor = ${colors[4]}, bgcolor = ${colors[5]}, labeljust=left, fontsize = 10 ]\n`+
            ` node [ tooltip = " ", fontname = helvetica, shape = box, style = "filled,rounded", color = ${colors[1]}, fontcolor = ${colors[4]}, fillcolor = invis, fontsize = 14 ]\n`+
            ` edge [ tooltip = " ", fontname = helvetica, color = "${colors[1]}" , fontsize = 10 ]\n`+
            this.renderContent(pad+" ")+
            this.allLinks.map(link => link.render(pad+" ")).join("")+pad+"}";
    }
}
export function system(name: string) {
    return new System(name);
}

export class Instance extends Node {
    name?: string;
    label: string;
    host: Host;
    constructor(name: string) {
        super("instance");
        this.name = name;
    }
    details(text?: string): Instance {
        this.label = this.label || "";
        this.label += text;
        return this;
    }
    multiple() : Instance {
        this.isMultiple = true;
        return this;
    }
    to(target : Instance) : Link {
        return new Link(this, target);
    }
    with(target : Instance) : Link {
        return new Link(this, target).bidirectional();
    }
    configuration(target : Instance) : Link {
        return new Link(this, target).configuration();
    }
    creates(target: Instance) : Link {
        return new Link(this, target).creation();
    }
    on(host: Host) : Instance {
        host.contains(this);
        return this;
    }
    render(pad: string) {
        var label = this.label ? `<TR><TD><FONT POINT-SIZE="10">${this.label}</FONT></TD></TR>` : "";
        return pad+this.id+` [ label = <<TABLE BORDER="0"><TR><TD>${this.name}</TD></TR>${label}</TABLE>>`
            +(this.isMultiple?`, fillcolor=${colors[0]}`:"")+" ];\n";
    }
    isActuallyMultiple(): boolean {
        return this.isMultiple || ( this.host && this.host.isMultiple);
    }
    in(parent: Container): Instance {
        parent.add(this);
        return this;
    }
}

class Link extends Element {
    source : Instance;
    target : Instance;
    isBidirectional: boolean;
    isConfiguration: boolean;
    isMultiple: boolean;
    isCreation: boolean;
    isDynamic: boolean;
    chain: Link[] = [];
    constructor(source : Instance, target : Instance) {
        super();
        this.isMultiple = target.isActuallyMultiple()
        this.source = source;
        this.target = target;
        this.chain.push(this);
    }
    to(next: Instance) : Link {
        var link = this.target.to(next);
        this.chain.push(link);
        link.chain = this.chain;
        return link;
    }
    bidirectional() {
        this.isBidirectional = true;
        this.isMultiple = this.target.isActuallyMultiple() || this.source.isActuallyMultiple();
        return this;
    }
    configuration() {
        this.isConfiguration = true;
        return this;
    }
    dynamic() {
        this.isDynamic = true;
        return this;
    }
    creation() {
        this.isCreation = true;
        return this;
    }
    single() {
        this.isMultiple = false;
        return this;
    }
    render(pad: string) {
        var options = [];
        var source, target, backwards;
        if(this.source.id < this.target.id) {
            source = this.source;
            target = this.target;
        } else {
            source = this.target;
            target = this.source;
            backwards = true;
        }
        if(this.isBidirectional) {
            options.push("dir = both");
        } else if(backwards) {
            options.push("dir = back");
        }
        if(this.isConfiguration) {
            options.push("style = dashed");
        } else if(this.isCreation) {
            options.push("style = dotted");
        }
        var color = colors[1];
        if(this.isConfiguration || this.isDynamic) {
            color = colors[6];
        }
        if(this.isMultiple && !this.isCreation) {
            options.push(`color = "${color}:${color}"`);
        } else {
            if(color != colors[1]) {
                options.push(`color = "${color}"`);
            }
        }
        return pad+String(source.id) +" -> "+String(target.id)+" [ "+
        options.join(", ")+
        " ];\n";
    }
}

export class Host extends Node {
    instances: Instance[] = [];
    contains(...instances: Instance[]) {
        instances.forEach(instance => {
            this.instances.push(instance);
            instance.host = this;
        })
        return this;
    }
    multiple() : Host {
        this.isMultiple = true;
        return this;
    }
    constructor() {
        super("host");
    }
    render(pad: string) {
        return pad+"subgraph cluster_"+String(this.id)+" {\n"+
            pad+` graph [ tooltip = " ", label="", penwidth = 2, color = ${colors[3]}, fillcolor=${colors[2]} `+(this.isMultiple?',style=filled':'')+" ];\n"+
            this.instances.map(instance => instance.render(pad+" ")).join("")+
            pad+"}\n";
    }
    in(parent: Container): Host {
        parent.add(this);
        return this;
    }
}

export function generate(init: ()=>void, systemProviders: (()=>System)[], processors?: (()=>string)[], opts?) {
    opts = opts || {};
    processors = processors || [(() => null)];
    var header = ["<table class='archix-table'>"];
    if(opts.header) {
        header.push("<tr><th></th>");
    }
    var table = [];
    var row = 0;
    if(typeof window !== 'undefined') {
        colors = themes.light;
    }
    systemProviders.forEach( systemProvider => {
        var col = 0;
        processors.forEach(processor => {
            if(init) {
              init();
            }
            var procName = processor();
            var sys = systemProvider();
            var sysName = sys.name;
            if(procName) {
                sys.name += ("-"+procName);
            }
            var name = sys.name;
            if(systemProviders.length == 1) {
                if(processors.length == 1) {
                    sys.name = " "
                } else if(processors.length > 1) {
                    sys.name = procName;
                }
            }
            var dot = sys.render("");
            console.log(dot)
            var out = "target";
            var rendered = !sys.processors || sys.processors.indexOf(processor) !== -1
            if(typeof window !== 'undefined') {
                if(opts.header) {
                    if(row == 0) {
                        header.push("<th>"+procName+"</th>")
                    }
                    if(col == 0) {
                        table.push("<th>"+sysName+"</th>")
                    }
                }
                table.push("<td>");
                if(rendered) {
                    table.push(Viz(dot));
                }
                table.push("</td>");
            } else if(!opts.native && rendered) {
                try {
                    fs.mkdirSync(out);
                } catch(e) {}
                fs.writeFileSync(`${out}/${name}.svg`, Viz(dot));
            } else if (rendered) {
                fs.writeFileSync(`${out}/${name}.dot`, dot);
                exec(`dot -Tpng -o ${out}/${name}.png ${out}/${name}.dot`,
                    (err, stdout, stderr) => {
                        if(err) {
                            console.error(err);
                        } else {
                            console.log(name);
                            if(stdout.length>2) console.log(stdout);
                            if(stderr.length>2) console.error(stderr);
                        }
                    });
            }
            col++;
        })
        if(row==0) {
            header.push("</tr>");
        }
        table.push("</tr>");
        row++;
    })
    table.push("</table>");
    if(typeof window !== 'undefined') {
        window.document.getElementById("archix").innerHTML = header.concat(table).join("\n");
    }
}

export function details(name: string, labels: Array<[Instance|Instance[],string]>): string {
    labels.forEach( pair => {
        var target = pair[0];
        if(target instanceof Instance) {
            target.details(pair[1]);
        } else if(target) {
            target.forEach( instance => instance.details(pair[1]));
        }
    });
    return name;
}
