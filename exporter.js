(()=> {
    if(typeof System !== 'undefined') {
        var archix = require('./archix');
        System.config({
            transpiler: 'typescript',
        });
        System.registerDynamic('archix', [], false, function(require, exports, module) {
            module.exports = archix;
        });
        System.import('index.ts').then(() => { 
            var legend = document.getElementById('legend')
            if(legend) legend.innerHTML = "<a name='legend'><img src='../archix/legend.svg'/></a>";
        }, console.error.bind(console));
    }
})();