/**
 A cloud of randomly-scattered boxes

 @author xeolabs / http://xeolabs.com

 <p>Usage example:</p>

 <pre>
 someNode.addNode({
       type: "geometry/randomObjects",
       numBoxes: 1000 // (default)
   });
 </pre>
 */


SceneJS.Types.addType("geometry/randomObjects", {

    construct: function (params) {

        var numObjects = params.numObjects || 1000;
        var materials = params.materials != false;
        var alpha = params.alpha || 1;
        var hasRandomTransparency = params.randomTransparency ? true : false;
        var randomTransparency = params.randomTransparency || 0;
        var node;

        var curAlpha = 1;
        for (var i = 0, len = numObjects; i < len; i++) {

            // Random position
            node = this.addNode({
                type: "translate",
                x: Math.random() * 500 - 250,
                y: Math.random() * 500 - 250,
                z: Math.random() * 500 - 250
            });

            // Random orientation
            node = node.addNode({
                type: "rotate",
                x: Math.random(),
                y: Math.random(),
                z: Math.random(),
                angle: Math.random() * 360
            });

            // Size
//            node = node.addNode({
//                type: "scale",
//                x: 4.0,
//                y: 4.0,
//                z: 4.0
//            });

            // Size
            node = node.addNode({
                type: "scale",
                x: 3.0,
                y: 6.0,
                z: 3.0
            });

            if (materials) {

                if (hasRandomTransparency) {
                    if(Math.random() < randomTransparency) {
                        node = node.addNode({
                            type: "flags",
                            flags: {
                                transparent: true
                            }
                        });
                        curAlpha = alpha;
                    } else {
                        curAlpha = 1;
                    }
                } else {
                    if (alpha < 1) {
                        node = node.addNode({
                            type: "flags",
                            flags: {
                                transparent: true
                            }
                        });
                    }
                }
                

                // Random material
                node = node.addNode({
                    type: "material",
                    color: {
                        r: Math.random(),
                        g: Math.random(),
                        b: Math.random()
                    },
                    alpha: curAlpha
                });
            }
            
            //console.log('fuck test');

            // Geometry
            node.addNode({
                type: "geometry/box",
                coreId: "box"
            });
        }
    }
});
