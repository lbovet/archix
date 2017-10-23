import {Host, Instance, Group, generate, system} from "..";

var i1 = new Instance("i1")
var i2 = new Instance("i2")
var h1 = new Host();
var h2 = new Host();
var g1 = new Group("g1");
var g2 = new Group("g2");

generate(null, [ () =>
  system("test").
    is(i1.on(h1).in(g1).to(i2.in(g2)))
]);
