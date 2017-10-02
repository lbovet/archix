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
            var legend = document.getElementById('archix-legend')
            if(legend) legend.style.display = 'block';
        }, console.error.bind(console));
    }
})();