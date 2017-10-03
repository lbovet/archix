declare interface GroupId {}
declare interface Node {}

export declare class Instance implements Node {
    constructor(name: string, groupId?: GroupId);
    label(details?: string): Instance;
    multiple() : Instance;
    to(target : Instance) : Link;
    with(target : Instance) : Link;
    registry(target : Instance) : Link;
}

export declare class Host implements Node {
    contains(...instances: Instance[]);
    multiple() : Host;
    constructor(groupId?: GroupId);
}

export declare interface Link {
        bidirectional();
        registry();
        discovered();
        deploy();
        single();
}

export declare interface System {        
    contains(...nodes: Node[]): System;
    links(...links: Link[]): System;
    qualify(qualifier: String): System;
}

export declare function system(name: String): System;
export declare function group(): GroupId;
export function technology(name: string, labels: Array<[Instance,string]>): string;
export declare function generate(init: ()=>void, processors: (()=>string)[], systemProviders: (()=>System)[], opts?);