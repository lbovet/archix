declare module "archix" {
    interface GroupId {}
    interface Node {}

    class Instance implements Node {
        constructor(name: string, groupId?: GroupId);
        label(details?: string): Instance;
        multiple() : Instance;
        to(target : Instance) : Link;
        with(target : Instance) : Link;
        registry(target : Instance) : Link;
        on(host: Host): Instance; 
    }

    class Host implements Node {
        multiple() : Host;
        constructor(groupId?: GroupId);
    }

    interface Link {
            to(instance: Instance) : Link;
            bidirectional();
            discovered();
            deploy();
            single();        
    }

    interface System {       
        is(...links: Link[]): System;
    }

    function system(name: string): System;
    function group(): GroupId;
    function technology(name: string, labels: Array<[Instance|Instance[],string]>): string;
    function generate(init: ()=>void, systemProviders: (()=>System)[], processors?: (()=>string)[], opts?);
}