declare module "archix" {
    interface Node {}

    /**
     * Represents a process or a deployment.
     */
    class Instance implements Node {
        /**
         * Creates an instance.
         *
         * @param name The role of this instance.
         */
        constructor(name: string);

        /**
         * Gives more information about this instance, typically its technology.
         *
         * @param details The label string to add, use <BR/> for new lines.
         */
        details(text?: string): Instance;

        /**
         * Marks this instance as being part of a set of replicated instances (scalability).
         * @return This instance for method chaining.
         */
        multiple() : Instance;

        /**
         * Declares a connection to another instance this instance is using.
         *
         * @param target The other instance used by this instance.
         * @return The declared link.
         */
        to(target : Instance) : Link;

        /**
         * Declares a bidirectional connection with another instance.
         *
         * @param target The other instance.
         * @return The declared link.
         */
        with(target : Instance) : Link;

        /**
         * Declares another instance as being a configuration link for dynamic connections, e.g. registration or discovery.
         *
         * @param target The registry instance.
         * @return The declared link.
         */
        configuration(target : Instance) : Link;

        /**
         * Declare another instance as being created by this instance, e.g. deployment or provisioning.
         * @return This link for method chaining.
         */
        creates(target : Instance) : Link;

        /**
         * Declares this instance to be running on a host.
         *
         * @param host The host which the instances runs on.
         * @return This instance for method chaining.
         */
        on(host: Host): Instance;

        /**
         * Include this instance into a group.
         *
         * @param parent the group to include this instance into.
         * @return This instance for method chaining.
         */
        in(parent: Group): Instance;
    }

    /**
     * Represents a physical environment gathering instances running without physical network boundaries.
     */
    class Host implements Node {
        /**
         * Marks this host as being part of a set of replicated hosts (scalability).
         * @return This host for method chaining.
         */
        multiple() : Host;

        /**
         * Creates a host.
         */
        constructor();

        /**
         * Include this host into a group.
         *
         * @param parent the group to include this host into.
         * @return This host for method chaining.
         */
        in(parent: Group): Host;
    }

    /**
     * A context gathering instances and nodes.
     */
    class Group {
        /**
         * Creates a group.
         * @param name the display name of the group. If absent, the group
         * boundaries are invisible.
         */
        constructor(name?: string);

        /**
         * Include this group into another group.
         *
         * @param parent the group to include this group into.
         * @return This group for method chaining.
         */
        in(parent: Group): Group;
    }

    /**
     * Represent a connection denoting the usage of an instance from another one.
     */
    interface Link {
        /**
         * Declare a connection from the current target instance to another instance it is using.
         * @param next The instance this link's target uses.
         */
        to(next: Instance) : Link;

        /**
         * Marks this link as bi-directional.
         * @return This link for method chaining.
         */
        bidirectional();

        /**
         * Marks this link as being dynamically established, e.g. discovered from a registry.
         * @return This link for method chaining.
         */
        dynamic();

        /**
         * Force this link to be non-balanced.
         * @return This link for method chaining.
         */
        single();
    }

    /**
     * Represents a topology involving linked instances.
     */
    interface System {
        /**
         * Declare the links in this system.
         */
        is(...links: Link[]): System;

        /**
         * Instructs the generator to use only these processors for this system.
         */
        only(...processors: (()=>string)[]): System;
    }

    /**
     * Declares a system.
     *
     * @param name A name identifying the topology.
     * @return A new system.
     */
    function system(name: string): System;

    /**
     * Convenience processsor to add details label to instances.
     *
     * @param name A name identifying the processor.
     * @param labels An array of array associating the instances to their labels.
     */
    function details(name: string, labels: Array<[Instance|Instance[],string]>): string;

    /**
     * Generates the diagrams.
     *
     * @param init An initialization function run for each diagrams. Can be null.
     * @param systemProviders An array of functions providing the systems.
     * @param processors An array of functions providing alteration to the systems for variant (e.g. details).
     * @param opts Additional options: [native: boolean, if true uses a local graphviz installation].
     */
    function generate(init: ()=>void, systemProviders: (()=>System)[], processors?: (()=>string)[], opts?);
}
