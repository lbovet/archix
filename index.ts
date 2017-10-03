import * as fs from "fs";
import {exec} from "child_process";
var Viz: (string)=>string = require('viz.js')

const themes = {
    light: ["bisque", "bisque4", "lightcyan2", "lightcyan3", "grey20", "white", "deepskyblue4"],
    dark: ["\"#302315\"", "bisque", "darkslategray", "lightcyan4", "grey90", "grey12", "aquamarine"]
}

var colors = themes.dark;

abstract class Element {
    id: string;
    constructor(prefix?: string, name?: string) {
        this.id = prefix+"_"+String(100+Element.counter++);
    }
    private static counter : number = 0;
    abstract render(pad: string): string;
}

abstract class Node extends Element {
    isMultiple: boolean;
    groupId: GroupId;
    constructor(prefix:string, groupId?: GroupId) {
        super(prefix);
        this.groupId = groupId;
    }
}

class GroupId { }
export function group() {
    return new GroupId();
}

abstract class Container extends Element {
    nodes: Node[] = [];
    add(node: Node) {
        this.nodes.push(node);
    }
    renderContent(pad: string): string {
        return this.nodes.map(node => node.render(pad)).join("");
    }
} 

class Group extends Container {
    render(pad: string) {
        return pad+"subgraph cluster_"+this.id+" {\n"+
        pad+' graph [ label = "", color = invis ];\n'+
        this.renderContent(pad+" ")+
        pad+"}\n";
    }
    constructor() {
        super("group");
    }
}

class System extends Container {
    name: String;
    groups: Map<GroupId,Group> = new Map();
    allLinks: Link[] = [];        
    constructor(name: String) {
        super();
        this.name = name;
    }
    contains(...nodes: Node[]) {
        nodes.forEach( node => {
            if(node.groupId) {
                var group = this.groups.get(node.groupId);
                if(!group) {
                    group = new Group();
                    this.groups.set(node.groupId, group);
                }
                group.add(node);
            } else {
                this.add(node);
            }
        });
        return this;
    }
    links(...links: Link[]) {
        this.allLinks.push(...links);
        return this;
    }
    render(pad: string) {
        return "digraph {\n"+
            ` graph [ tooltip = " ", fontname = helvetica, nodesep = 0.5, label = <${this.name}<BR/><BR/><BR/>>, labelloc=top, fontcolor = ${colors[4]}, bgcolor = ${colors[5]}, labeljust=left, fontsize = 10 ]\n`+
            ` node [ tooltip = " ", fontname = helvetica, shape = box, style = "filled,rounded", color = ${colors[1]}, fontcolor = ${colors[4]}, fillcolor = invis, fontsize = 14 ]\n`+
            ` edge [ tooltip = " ", fontname = helvetica, color = "${colors[1]}" , fontsize = 10 ]\n`+
            this.renderContent(pad+" ")+
            Array.from(this.groups.values()).map(group => group.render(pad+" ")).join("")+
            this.allLinks.map(link => link.render(pad+" ")).join("")+pad+"}";       
    }
    qualify(qualifier: String) {
        this.name = this.name + "-"+qualifier;
        return this;
    }
}
export function system(name: String) {
    return new System(name);
}

export class Instance extends Node {
    name?: string;
    details: string = ' ';
    host: Host;
    constructor(name: string, groupId?: GroupId) {
        super("instance", groupId);
        this.name = name;
    }
    label(details?: string): Instance {
        this.details = details;
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
    registry(target : Instance) : Link {
        return new Link(this, target).registry();
    }
    render(pad: string) {
        return pad+this.id+` [ label = <<TABLE BORDER="0"><TR><TD>${this.name}</TD></TR><TR><TD><FONT POINT-SIZE="10">${this.details}</FONT></TD></TR></TABLE>>`
            +(this.isMultiple?`, fillcolor=${colors[0]}`:"")+" ];\n";
    }
    isActuallyMultiple(): boolean {
        return this.isMultiple || ( this.host && this.host.isMultiple);
    }
}

class Link extends Element {
    source : Instance;
    target : Instance;
    isBidirectional: boolean;
    backwards: boolean;
    isRegistry: boolean;
    isMultiple: boolean;
    isDeploy: boolean;
    isDiscovered: boolean;
    constructor(source : Instance, target : Instance) {
        super();
        this.isMultiple = target.isActuallyMultiple()
        if(source.id < target.id) {
            this.source = source;
            this.target = target;
        } else {
            this.source = target;
            this.target = source;
            this.backwards = true;
        }
    }
    bidirectional() {
        this.isBidirectional = true;
        this.isMultiple = this.target.isActuallyMultiple() || this.source.isActuallyMultiple();
        return this;
    }
    registry() {
        this.isRegistry = true;
        return this;
    }
    discovered() {
        this.isDiscovered = true;
        return this;
    }
    deploy() {
        this.isDeploy = true;
        return this;
    }
    single() {
        this.isMultiple = false;
    }
    render(pad: string) {
        var options = [];
        if(this.isBidirectional) {
            options.push("dir = both");
        } else if(this.backwards) {
            options.push("dir = back");
        }
        if(this.isRegistry) {
            options.push("style = dashed");
        } else if(this.isDeploy) {
            options.push("style = dotted");
        }
        var color = colors[1];
        if(this.isRegistry || this.isDiscovered) {
            color = colors[6];
        }        
        if(this.isMultiple && !this.isDeploy) {
            options.push(`color = "${color}:${color}"`);
        } else {
            if(color != colors[1]) {
                options.push(`color = "${color}"`);
            }
        }
        return pad+String(this.source.id) +" -> "+String(this.target.id)+" [ "+
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
    constructor(groupId?: GroupId) {
        super("host", groupId);
    }
    render(pad: string) {
        return pad+"subgraph cluster_"+String(this.id)+" {\n"+
            pad+` graph [ tooltip = " ", label="", penwidth = 2, color = ${colors[3]}, fillcolor=${colors[2]} `+(this.isMultiple?',style=filled':'')+" ];\n"+
            this.instances.map(instance => instance.render(pad+" "))+
            pad+"}\n";
    }
}

export function generate(init: ()=>void, processors: (()=>string)[], systemProviders: (()=>System)[], opts?) {
    opts = opts || {};
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
            init();
            var procName = processor();
            var sys = systemProvider();
            var sysName = sys.name;
            sys.qualify(procName);
            var name = sys.name;
            var dot = sys.render("");                  
            var out = "target";     
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
                table.push(Viz(dot));
                table.push("</td>");                
            } else if(!opts.native) {
                try {
                    fs.mkdirSync(out);
                } catch(e) {}
                fs.writeFileSync(`${out}/${name}.svg`, Viz(dot));
            } else {
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

export function technology(name: string, labels: Array<[Instance,string]>): String {
    labels.forEach( pair => {
        pair[0].label(pair[1]);
    })
    return name;
}

