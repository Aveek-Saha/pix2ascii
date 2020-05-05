
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.22.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.22.2 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    // (73:4) {:else}
    function create_else_block(ctx) {
    	let button;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Generate";
    			attr_dev(button, "class", "btn btn-error btn-ghost");
    			button.disabled = true;
    			add_location(button, file, 73, 5, 2142);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(73:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (70:4) {#if files!== undefined && width < 501 && width > 99 && chars!== ""}
    function create_if_block(ctx) {
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Generate";
    			attr_dev(button, "class", "btn btn-primary");
    			add_location(button, file, 70, 5, 2050);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*sendForm*/ ctx[3], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(70:4) {#if files!== undefined && width < 501 && width > 99 && chars!== \\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let a;
    	let t1;
    	let div9;
    	let div8;
    	let div6;
    	let fieldset0;
    	let legend0;
    	let t3;
    	let div3;
    	let label0;
    	let t5;
    	let input0;
    	let t6;
    	let div4;
    	let label1;
    	let t8;
    	let input1;
    	let t9;
    	let div5;
    	let label2;
    	let t11;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let t15;
    	let t16;
    	let div7;
    	let form;
    	let fieldset1;
    	let legend1;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*files*/ ctx[0] !== undefined && /*width*/ ctx[1] < 501 && /*width*/ ctx[1] > 99 && /*chars*/ ctx[2] !== "") return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			a = element("a");
    			a.textContent = "Pix 2 Ascii";
    			t1 = space();
    			div9 = element("div");
    			div8 = element("div");
    			div6 = element("div");
    			fieldset0 = element("fieldset");
    			legend0 = element("legend");
    			legend0.textContent = "Upload Image";
    			t3 = space();
    			div3 = element("div");
    			label0 = element("label");
    			label0.textContent = "Pick an image:";
    			t5 = space();
    			input0 = element("input");
    			t6 = space();
    			div4 = element("div");
    			label1 = element("label");
    			label1.textContent = "Number of characters in a row:";
    			t8 = space();
    			input1 = element("input");
    			t9 = space();
    			div5 = element("div");
    			label2 = element("label");
    			label2.textContent = "Characterset:";
    			t11 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Grayscale 70 ";
    			option1 = element("option");
    			option1.textContent = "Grayscale 10 ";
    			option2 = element("option");
    			option2.textContent = "Blocks";
    			t15 = space();
    			if_block.c();
    			t16 = space();
    			div7 = element("div");
    			form = element("form");
    			fieldset1 = element("fieldset");
    			legend1 = element("legend");
    			legend1.textContent = "ASCII Art";
    			attr_dev(a, "href", "/");
    			attr_dev(a, "class", "no-style");
    			add_location(a, file, 32, 36, 787);
    			attr_dev(div0, "class", "logo terminal-prompt");
    			add_location(div0, file, 32, 2, 753);
    			attr_dev(div1, "class", "terminal-logo");
    			add_location(div1, file, 30, 1, 708);
    			attr_dev(div2, "class", "terminal-nav");
    			add_location(div2, file, 29, 0, 680);
    			add_location(legend0, file, 50, 4, 1235);
    			attr_dev(label0, "for", "file");
    			add_location(label0, file, 52, 5, 1299);
    			attr_dev(input0, "id", "file");
    			attr_dev(input0, "name", "file");
    			attr_dev(input0, "type", "file");
    			add_location(input0, file, 53, 5, 1345);
    			attr_dev(div3, "class", "form-group");
    			add_location(div3, file, 51, 4, 1269);
    			attr_dev(label1, "for", "width");
    			add_location(label1, file, 56, 5, 1451);
    			attr_dev(input1, "id", "width");
    			attr_dev(input1, "name", "width");
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", "100");
    			attr_dev(input1, "max", "500");
    			attr_dev(input1, "placeholder", "Range: 100 - 500");
    			add_location(input1, file, 57, 5, 1514);
    			attr_dev(div4, "class", "form-group");
    			add_location(div4, file, 55, 4, 1421);
    			attr_dev(label2, "for", "select");
    			add_location(label2, file, 61, 5, 1680);
    			option0.__value = "gscale_70";
    			option0.value = option0.__value;
    			add_location(option0, file, 63, 5, 1788);
    			option1.__value = "gscale_10";
    			option1.value = option1.__value;
    			add_location(option1, file, 64, 5, 1843);
    			option2.__value = "gscale_block";
    			option2.value = option2.__value;
    			add_location(option2, file, 65, 5, 1898);
    			attr_dev(select, "id", "select");
    			attr_dev(select, "name", "select");
    			if (/*chars*/ ctx[2] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[6].call(select));
    			add_location(select, file, 62, 5, 1728);
    			attr_dev(div5, "class", "form-group");
    			add_location(div5, file, 60, 4, 1650);
    			add_location(fieldset0, file, 49, 4, 1220);
    			attr_dev(div6, "class", "column column-40 column-offset-10");
    			add_location(div6, file, 47, 2, 1149);
    			add_location(legend1, file, 83, 4, 2333);
    			add_location(fieldset1, file, 82, 4, 2318);
    			add_location(form, file, 81, 3, 2307);
    			attr_dev(div7, "class", "column column-40");
    			add_location(div7, file, 80, 2, 2273);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file, 46, 1, 1129);
    			attr_dev(div9, "class", "container");
    			add_location(div9, file, 44, 0, 1102);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, a);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div6);
    			append_dev(div6, fieldset0);
    			append_dev(fieldset0, legend0);
    			append_dev(fieldset0, t3);
    			append_dev(fieldset0, div3);
    			append_dev(div3, label0);
    			append_dev(div3, t5);
    			append_dev(div3, input0);
    			append_dev(fieldset0, t6);
    			append_dev(fieldset0, div4);
    			append_dev(div4, label1);
    			append_dev(div4, t8);
    			append_dev(div4, input1);
    			set_input_value(input1, /*width*/ ctx[1]);
    			append_dev(fieldset0, t9);
    			append_dev(fieldset0, div5);
    			append_dev(div5, label2);
    			append_dev(div5, t11);
    			append_dev(div5, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			select_option(select, /*chars*/ ctx[2]);
    			append_dev(fieldset0, t15);
    			if_block.m(fieldset0, null);
    			append_dev(div8, t16);
    			append_dev(div8, div7);
    			append_dev(div7, form);
    			append_dev(form, fieldset1);
    			append_dev(fieldset1, legend1);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input0, "change", /*input0_change_handler*/ ctx[4]),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[5]),
    				listen_dev(select, "change", /*select_change_handler*/ ctx[6])
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*width*/ 2 && to_number(input1.value) !== /*width*/ ctx[1]) {
    				set_input_value(input1, /*width*/ ctx[1]);
    			}

    			if (dirty & /*chars*/ 4) {
    				select_option(select, /*chars*/ ctx[2]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(fieldset0, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div9);
    			if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let files, width, chars;

    	function sendForm() {
    		console.log(files[0], width, chars);
    		var formData = new FormData();
    		formData.append("image", files[0]);
    		formData.append("width", width);
    		formData.append("charset", chars);
    		var request = new XMLHttpRequest();
    		request.open("POST", "http://localhost:5001/pix2ascii/us-central1/ascii");
    		request.send(formData);

    		request.onreadystatechange = function () {
    			if (request.readyState === XMLHttpRequest.DONE) {
    				var status = request.status;

    				if (status === 0 || status >= 200 && status < 400) {
    					console.log(request.responseText);
    				} else {
    					console.log("Error");
    				}
    			}
    		};
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function input0_change_handler() {
    		files = this.files;
    		$$invalidate(0, files);
    	}

    	function input1_input_handler() {
    		width = to_number(this.value);
    		$$invalidate(1, width);
    	}

    	function select_change_handler() {
    		chars = select_value(this);
    		$$invalidate(2, chars);
    	}

    	$$self.$capture_state = () => ({ files, width, chars, sendForm });

    	$$self.$inject_state = $$props => {
    		if ("files" in $$props) $$invalidate(0, files = $$props.files);
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("chars" in $$props) $$invalidate(2, chars = $$props.chars);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		files,
    		width,
    		chars,
    		sendForm,
    		input0_change_handler,
    		input1_input_handler,
    		select_change_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		// name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
