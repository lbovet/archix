import {Host, Instance, Group, generate, system} from "..";

var i1 = new Instance("i1")
var i2 = new Instance("i2")
var h1 = new Host();
var h2 = new Host();
var g1 = new Group("g1");
var g2 = new Group("g2");

generate(
    () => {
        i1.on(h1);
        h1.in(g1);
        i2.multiple();
        i2.in(g2);
        i2.on(h2);
        g1.in(g2);
        h1.multiple();
    },
    [ () =>
      system("test").is(i1.to(i2).name("n").configuration())
]);
