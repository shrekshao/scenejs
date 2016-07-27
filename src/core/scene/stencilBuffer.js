(function () {

    var lookup = {
        // stencilFunc.func
        never: "NEVER", 
        less: "LESS",
        equal: "EQUAL",
        lequal: "LEQUAL",
        greater: "GREATER",
        notequal: "NOTEQUAL",
        gequal: "GEQUAL",
        always: "ALWAYS",

        // stencilOp
        keep: "KEEP",
        zero: "ZERO",
        replace: "REPLACE",
        incr: "INCR",
        incr_wrap: "INCR_WRAP",
        decr: "DECR",
        decr_wrap: "DECR_WRAP",
        invert: "INVERT"
    };

    // The default state core singleton for {@link SceneJS.StencilBuf} nodes
    var defaultCore = {
        type: "stencilBuffer",
        stateId: SceneJS._baseStateId++,
        enabled: false,
        clearStencil: 0,
        stencilFunc: {func: null, ref: 1, mask: 0xff}, // Lazy init stencilFunc when we can get a context
        stencilOp: {sfail: null, dpfail: null, dppass: null}, 
        _stencilFuncState: {func: "always", ref: 1, mask: 0xff},
        _stencilOpState: {sfail: "keep", dpfail: "keep", dppass: "keep"}
    };

    var coreStack = [];
    var stackLen = 0;

    SceneJS_events.addListener(
        SceneJS_events.SCENE_COMPILING,
        function (params) {
            if (defaultCore.stencilFunc.func === null) { // Lazy-init stencilFunc now we can get a context
                defaultCore.stencilFunc.func = params.engine.canvas.gl.ALWAYS;
                
                defaultCore.stencilOp.sfail = params.engine.canvas.gl.KEEP;
                defaultCore.stencilOp.dpfail = params.engine.canvas.gl.KEEP;
                defaultCore.stencilOp.dppass = params.engine.canvas.gl.KEEP;
            }
            params.engine.display.stencilBuffer = defaultCore;
            stackLen = 0;
        });

    /**
     * @class Scene graph node which configures the stencil buffer for its subgraph
     * @extends SceneJS.Node
     */
    SceneJS.StencilBuf = SceneJS_NodeFactory.createNodeType("stencilBuffer");

    SceneJS.StencilBuf.prototype._init = function (params) {

        if (params.enabled != undefined) {
            this.setEnabled(params.enabled);
        } else if (this._core.useCount == 1) { // This node defines the core
            this.setEnabled(true);
        }

        if (params.clearStencil != undefined) {
            this.setClearStencil(params.clearStencil);
        } else if (this._core.useCount == 1) {
            this.setClearStencil(1);
        }

        if (params.stencilFunc != undefined) {
            this.setStencilFunc(params.stencilFunc);
        } else if (this._core.useCount == 1) {
            this.setStencilFunc({
                func: "always", 
                ref: 1, 
                mask: 0xff
            });
        }

        if (params.stencilOp != undefined) {
            this.setStencilOp(params.stencilOp);
        } else if (this._core.useCount == 1) {
            this.setStencilOp({
                sfail: "keep", 
                dpfail: "keep", 
                dppass: "keep"
            });
        }

        if (params.clear != undefined) {
            this.setClear(params.clear);
        } else if (this._core.useCount == 1) {
            this.setClear(true);
        }
    };

    /**
     * Enable or disable the stencil buffer
     *
     * @param enabled Specifies whether stencil buffer is enabled or not
     * @return {*}
     */
    SceneJS.StencilBuf.prototype.setEnabled = function (enabled) {
        if (this._core.enabled != enabled) {
            this._core.enabled = enabled;
            this._engine.display.imageDirty = true;
        }
        return this;
    };

    /**
     * Get whether or not the stencil buffer is enabled
     *
     * @return Boolean
     */
    SceneJS.StencilBuf.prototype.getEnabled = function () {
        return this._core.enabled;
    };

    /**
     * Sets whether or not to clear the stencil buffer before each render
     *
     * @param clear
     * @return {*}
     */
    SceneJS.StencilBuf.prototype.setClear = function (clear) {
        if (this._core.clear != clear) {
            this._core.clear = clear;
            this._engine.display.imageDirty = true;
        }
        return this;
    };

    /**
     * Get whether or not the stencil buffer is cleared before each render
     *
     * @return Boolean
     */
    SceneJS.StencilBuf.prototype.getClear = function () {
        return this._core.clear;
    };
    
    /**
     * Specify the clear value for the stencil buffer.
     * Initial value is 1, and the given value will be clamped to [0..1].
     * @param clearStencil
     * @return {*}
     */
    SceneJS.StencilBuf.prototype.setClearStencil = function (clearStencil) {
        if (this._core.clearStencil != clearStencil) {
            this._core.clearStencil = clearStencil;
            this._engine.display.imageDirty = true;
        }
        return this;
    };

    /**
     * Get the clear value for the stencil buffer
     *
     * @return Number
     */
    SceneJS.StencilBuf.prototype.getClearStencil = function () {
        return this._core.clearStencil;
    };

    /**
     * Sets the stencil comparison function.
     * Supported values are 'keep', 'always', 'less', 'equal', 'lequal', 'greater', 'notequal' and 'gequal'
     * @param {String} stencilFunc The stencil comparison function
     * @return {*}
     */
    SceneJS.StencilBuf.prototype.setStencilFunc = function (stencilFunc) {
        stencilFunc.ref = stencilFunc.ref || 1;
        stencilFunc.mask = stencilFunc.mask || 0xff;

        if (this._core._stencilFuncState === undefined || 
            this._core._stencilFuncState.func != stencilFunc.func || 
            this._core._stencilFuncState.ref != stencilFunc.ref ||
            this._core._stencilFuncState.mask != stencilFunc.mask 
            ) {

            var funcEnumName = lookup[stencilFunc.func];
            if (funcEnumName == undefined) {
                throw "unsupported value for 'clearFunc' attribute on stencilBuffer node: '" + stencilFunc.func
                    + "' - supported values are 'keep', 'always', 'less', 'equal', 'lequal', 'greater', 'notequal' and 'gequal'";
            }

            this._core.stencilFunc = {
                func: this._engine.canvas.gl[funcEnumName],
                ref: stencilFunc.ref,
                mask: stencilFunc.mask
            };
            this._core._stencilFuncState = stencilFunc;  // state map
            this._engine.display.imageDirty = true;
        }
        return this;
    };

    /**
     * Sets the stencil comparison function.
     * Supported values are 'keep', 'zero', 'replace', 'incr', 'incr_wrap', 'decr', 'decr_wrap', 'invert'
     * @param {String} stencilFunc The stencil comparison function
     * @return {*}
     */
    SceneJS.StencilBuf.prototype.setStencilOp = function (stencilOp) {
        if (this._core._stencilOpState === undefined ||
            this._core._stencilOpState.sfail != stencilOp.sfail ||
            this._core._stencilOpState.dpfail != stencilOp.dpfail ||
            this._core._stencilOpState.dppass != stencilOp.dppass
            ) {
            var sfail = lookup[stencilOp.sfail];
            var dpfail = lookup[stencilOp.dpfail];
            var dppass = lookup[stencilOp.dppass];
            if (sfail == undefined || dpfail == undefined || dppass == undefined) {
                throw "unsupported value for 'clearFunc' attribute on stencilBuffer node: '" + stencilFunc
                    + "' - supported values are 'keep', 'zero', 'replace', 'incr', 'incr_wrap', 'decr', 'decr_wrap', 'invert'";
            }
            this._core.stencilOp = {
                sfail: this._engine.canvas.gl[sfail],
                dpfail: this._engine.canvas.gl[dpfail],
                dppass: this._engine.canvas.gl[dppass]
            };
            this._core._stencilOpState = stencilOp;
            this._engine.display.imageDirty = true;
        }
        return this;
    };

    /**
     * Returns the stencilFunc State
     * @return {*}
     */
    SceneJS.StencilBuf.prototype.getStencilFunc = function () {
        return this._core._stencilFuncState;
    };

    /**
     * Returns the stencilOp State
     * @return {*}
     */
    SceneJS.StencilBuf.prototype.getStencilState = function () {
        return this._core._stencilOpState;
    };

    SceneJS.StencilBuf.prototype._compile = function (ctx) {
        this._engine.display.stencilBuffer = coreStack[stackLen++] = this._core;
        this._compileNodes(ctx);
        this._engine.display.stencilBuffer = (--stackLen > 0) ? coreStack[stackLen - 1] : defaultCore;
        coreStack[stackLen] = null; // Release memory
    };

})();