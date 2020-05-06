
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
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
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
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
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

    // (97:2) {:else}
    function create_else_block_1(ctx) {
    	let div0;
    	let t0;
    	let div2;
    	let form;
    	let fieldset;
    	let legend;
    	let t2;
    	let div1;
    	let t3;
    	let t4;
    	let br0;
    	let t5;
    	let div3;
    	let br1;
    	let t6;
    	let button;
    	let t7;
    	let t8;
    	let br2;
    	let t9;
    	let br3;
    	let t10;
    	let a;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div2 = element("div");
    			form = element("form");
    			fieldset = element("fieldset");
    			legend = element("legend");
    			legend.textContent = "ASCII Art";
    			t2 = space();
    			div1 = element("div");
    			t3 = text(/*art*/ ctx[5]);
    			t4 = space();
    			br0 = element("br");
    			t5 = space();
    			div3 = element("div");
    			br1 = element("br");
    			t6 = space();
    			button = element("button");
    			t7 = text("Copy");
    			t8 = space();
    			br2 = element("br");
    			t9 = space();
    			br3 = element("br");
    			t10 = space();
    			a = element("a");
    			a.textContent = "Go back";
    			attr_dev(div0, "class", "column column-20");
    			add_location(div0, file, 98, 2, 2714);
    			add_location(legend, file, 102, 4, 2813);
    			set_style(div1, "font-size", /*textSize*/ ctx[6] + "px");
    			set_style(div1, "line-height", /*textSize*/ ctx[6] + "px");
    			set_style(div1, "font-family", "monospace");
    			set_style(div1, "white-space", "pre-line");
    			add_location(div1, file, 103, 4, 2844);
    			add_location(fieldset, file, 101, 4, 2798);
    			add_location(form, file, 100, 3, 2787);
    			add_location(br0, file, 109, 3, 3012);
    			attr_dev(div2, "class", "column column-60");
    			add_location(div2, file, 99, 2, 2753);
    			add_location(br1, file, 112, 2, 3061);
    			attr_dev(button, "class", "btn btn-default copy");
    			attr_dev(button, "data-clipboard-text", /*art*/ ctx[5]);
    			add_location(button, file, 113, 3, 3069);
    			add_location(br2, file, 116, 2, 3157);
    			add_location(br3, file, 117, 2, 3164);
    			attr_dev(a, "class", "btn btn-default");
    			attr_dev(a, "href", "/");
    			add_location(a, file, 118, 3, 3172);
    			attr_dev(div3, "class", "column column-20");
    			add_location(div3, file, 111, 2, 3028);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, form);
    			append_dev(form, fieldset);
    			append_dev(fieldset, legend);
    			append_dev(fieldset, t2);
    			append_dev(fieldset, div1);
    			append_dev(div1, t3);
    			append_dev(div2, t4);
    			append_dev(div2, br0);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, br1);
    			append_dev(div3, t6);
    			append_dev(div3, button);
    			append_dev(button, t7);
    			append_dev(div3, t8);
    			append_dev(div3, br2);
    			append_dev(div3, t9);
    			append_dev(div3, br3);
    			append_dev(div3, t10);
    			append_dev(div3, a);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*art*/ 32) set_data_dev(t3, /*art*/ ctx[5]);

    			if (dirty & /*textSize*/ 64) {
    				set_style(div1, "font-size", /*textSize*/ ctx[6] + "px");
    			}

    			if (dirty & /*textSize*/ 64) {
    				set_style(div1, "line-height", /*textSize*/ ctx[6] + "px");
    			}

    			if (dirty & /*art*/ 32) {
    				attr_dev(button, "data-clipboard-text", /*art*/ ctx[5]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(97:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (57:1) {#if !generated}
    function create_if_block(ctx) {
    	let div0;
    	let t0;
    	let div4;
    	let fieldset;
    	let legend;
    	let t2;
    	let div1;
    	let label0;
    	let t4;
    	let input0;
    	let t5;
    	let div2;
    	let label1;
    	let t7;
    	let input1;
    	let t8;
    	let div3;
    	let label2;
    	let t10;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let t14;
    	let t15;
    	let dispose;

    	function select_block_type_1(ctx, dirty) {
    		if (/*files*/ ctx[0] !== undefined && /*width*/ ctx[1] < 501 && /*width*/ ctx[1] > 99 && /*chars*/ ctx[2] !== "") return create_if_block_2;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*err*/ ctx[4] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div4 = element("div");
    			fieldset = element("fieldset");
    			legend = element("legend");
    			legend.textContent = "Upload Image";
    			t2 = space();
    			div1 = element("div");
    			label0 = element("label");
    			label0.textContent = "Pick an image < 5mb (jpg, png, bmp):";
    			t4 = space();
    			input0 = element("input");
    			t5 = space();
    			div2 = element("div");
    			label1 = element("label");
    			label1.textContent = "Number of characters in a row:";
    			t7 = space();
    			input1 = element("input");
    			t8 = space();
    			div3 = element("div");
    			label2 = element("label");
    			label2.textContent = "Characterset:";
    			t10 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Grayscale 70 ";
    			option1 = element("option");
    			option1.textContent = "Grayscale 10 ";
    			option2 = element("option");
    			option2.textContent = "Blocks";
    			t14 = space();
    			if_block0.c();
    			t15 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div0, "class", "column column-25");
    			add_location(div0, file, 57, 2, 1370);
    			add_location(legend, file, 60, 4, 1459);
    			attr_dev(label0, "for", "file");
    			add_location(label0, file, 62, 5, 1523);
    			attr_dev(input0, "id", "file");
    			attr_dev(input0, "name", "file");
    			attr_dev(input0, "type", "file");
    			add_location(input0, file, 63, 5, 1593);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file, 61, 4, 1493);
    			attr_dev(label1, "for", "width");
    			add_location(label1, file, 66, 5, 1699);
    			attr_dev(input1, "id", "width");
    			attr_dev(input1, "name", "width");
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", "100");
    			attr_dev(input1, "max", "500");
    			attr_dev(input1, "placeholder", "Range: 100 - 500");
    			add_location(input1, file, 67, 5, 1762);
    			attr_dev(div2, "class", "form-group");
    			add_location(div2, file, 65, 4, 1669);
    			attr_dev(label2, "for", "select");
    			add_location(label2, file, 71, 5, 1928);
    			option0.__value = "gscale_70";
    			option0.value = option0.__value;
    			add_location(option0, file, 73, 5, 2036);
    			option1.__value = "gscale_10";
    			option1.value = option1.__value;
    			add_location(option1, file, 74, 5, 2091);
    			option2.__value = "gscale_block";
    			option2.value = option2.__value;
    			add_location(option2, file, 75, 5, 2146);
    			attr_dev(select, "id", "select");
    			attr_dev(select, "name", "select");
    			if (/*chars*/ ctx[2] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[11].call(select));
    			add_location(select, file, 72, 5, 1976);
    			attr_dev(div3, "class", "form-group");
    			add_location(div3, file, 70, 4, 1898);
    			add_location(fieldset, file, 59, 4, 1444);
    			attr_dev(div4, "class", "column column-50");
    			add_location(div4, file, 58, 2, 1409);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, fieldset);
    			append_dev(fieldset, legend);
    			append_dev(fieldset, t2);
    			append_dev(fieldset, div1);
    			append_dev(div1, label0);
    			append_dev(div1, t4);
    			append_dev(div1, input0);
    			append_dev(fieldset, t5);
    			append_dev(fieldset, div2);
    			append_dev(div2, label1);
    			append_dev(div2, t7);
    			append_dev(div2, input1);
    			set_input_value(input1, /*width*/ ctx[1]);
    			append_dev(fieldset, t8);
    			append_dev(fieldset, div3);
    			append_dev(div3, label2);
    			append_dev(div3, t10);
    			append_dev(div3, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			select_option(select, /*chars*/ ctx[2]);
    			append_dev(fieldset, t14);
    			if_block0.m(fieldset, null);
    			append_dev(div4, t15);
    			if (if_block1) if_block1.m(div4, null);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input0, "change", /*input0_change_handler*/ ctx[9]),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[10]),
    				listen_dev(select, "change", /*select_change_handler*/ ctx[11])
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*width*/ 2 && to_number(input1.value) !== /*width*/ ctx[1]) {
    				set_input_value(input1, /*width*/ ctx[1]);
    			}

    			if (dirty & /*chars*/ 4) {
    				select_option(select, /*chars*/ ctx[2]);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(fieldset, null);
    				}
    			}

    			if (/*err*/ ctx[4]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(div4, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(57:1) {#if !generated}",
    		ctx
    	});

    	return block;
    }

    // (83:4) {:else}
    function create_else_block(ctx) {
    	let button;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Generate";
    			attr_dev(button, "class", "btn btn-error btn-ghost");
    			button.disabled = true;
    			add_location(button, file, 83, 5, 2390);
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
    		source: "(83:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (80:4) {#if files!== undefined && width < 501 && width > 99 && chars!== ""}
    function create_if_block_2(ctx) {
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Generate";
    			attr_dev(button, "class", "btn btn-primary");
    			add_location(button, file, 80, 5, 2298);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*sendForm*/ ctx[7], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(80:4) {#if files!== undefined && width < 501 && width > 99 && chars!== \\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    // (89:3) {#if err}
    function create_if_block_1(ctx) {
    	let br0;
    	let t0;
    	let br1;
    	let t1;
    	let div;

    	const block = {
    		c: function create() {
    			br0 = element("br");
    			t0 = space();
    			br1 = element("br");
    			t1 = space();
    			div = element("div");
    			div.textContent = "Problem uploading image, check the file size, format or number of characters and try again.";
    			add_location(br0, file, 89, 4, 2507);
    			add_location(br1, file, 90, 4, 2516);
    			attr_dev(div, "class", "terminal-alert terminal-alert-error");
    			add_location(div, file, 91, 4, 2525);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(89:3) {#if err}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div2;
    	let div1;
    	let h30;
    	let div0;
    	let a0;
    	let t1;
    	let nav;
    	let ul;
    	let li;
    	let a1;
    	let h31;
    	let t3;
    	let div4;
    	let div3;
    	let t4;
    	let br;

    	function select_block_type(ctx, dirty) {
    		if (!/*generated*/ ctx[3]) return create_if_block;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			h30 = element("h3");
    			div0 = element("div");
    			a0 = element("a");
    			a0.textContent = "Pix 2 Ascii";
    			t1 = space();
    			nav = element("nav");
    			ul = element("ul");
    			li = element("li");
    			a1 = element("a");
    			h31 = element("h3");
    			h31.textContent = "#GitHub";
    			t3 = space();
    			div4 = element("div");
    			div3 = element("div");
    			if_block.c();
    			t4 = space();
    			br = element("br");
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "class", "no-style");
    			add_location(a0, file, 42, 36, 987);
    			attr_dev(div0, "class", "logo terminal-prompt");
    			add_location(div0, file, 42, 2, 953);
    			add_location(h30, file, 41, 1, 946);
    			attr_dev(div1, "class", "terminal-logo");
    			add_location(div1, file, 40, 1, 917);
    			add_location(h31, file, 47, 74, 1162);
    			attr_dev(a1, "class", "menu-item");
    			attr_dev(a1, "href", "https://github.com/Aveek-Saha/pix2ascii");
    			add_location(a1, file, 47, 6, 1094);
    			add_location(li, file, 47, 2, 1090);
    			add_location(ul, file, 46, 1, 1083);
    			attr_dev(nav, "class", "terminal-menu");
    			add_location(nav, file, 45, 1, 1054);
    			attr_dev(div2, "class", "terminal-nav");
    			add_location(div2, file, 39, 0, 889);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file, 55, 1, 1332);
    			attr_dev(div4, "class", "container");
    			add_location(div4, file, 53, 0, 1305);
    			add_location(br, file, 125, 0, 3261);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, h30);
    			append_dev(h30, div0);
    			append_dev(div0, a0);
    			append_dev(div2, t1);
    			append_dev(div2, nav);
    			append_dev(nav, ul);
    			append_dev(ul, li);
    			append_dev(li, a1);
    			append_dev(a1, h31);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			if_block.m(div3, null);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div3, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div4);
    			if_block.d();
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(br);
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
    	let generated = false, err = false;
    	let art = "";
    	let textSize = 15;
    	var clipboard = new ClipboardJS(".copy");

    	function sendForm() {
    		// console.log(files[0], width, chars);
    		var formData = new FormData();

    		$$invalidate(6, textSize = Math.floor(1500 / width));

    		// err = false
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
    					$$invalidate(4, err = false);
    					$$invalidate(5, art = request.responseText);
    					$$invalidate(3, generated = true);
    				} else {
    					$$invalidate(4, err = true);
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

    	$$self.$capture_state = () => ({
    		files,
    		width,
    		chars,
    		generated,
    		err,
    		art,
    		textSize,
    		clipboard,
    		sendForm
    	});

    	$$self.$inject_state = $$props => {
    		if ("files" in $$props) $$invalidate(0, files = $$props.files);
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("chars" in $$props) $$invalidate(2, chars = $$props.chars);
    		if ("generated" in $$props) $$invalidate(3, generated = $$props.generated);
    		if ("err" in $$props) $$invalidate(4, err = $$props.err);
    		if ("art" in $$props) $$invalidate(5, art = $$props.art);
    		if ("textSize" in $$props) $$invalidate(6, textSize = $$props.textSize);
    		if ("clipboard" in $$props) clipboard = $$props.clipboard;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		files,
    		width,
    		chars,
    		generated,
    		err,
    		art,
    		textSize,
    		sendForm,
    		clipboard,
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
