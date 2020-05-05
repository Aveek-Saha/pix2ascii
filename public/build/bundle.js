
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
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

    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let a;
    	let t1;
    	let div9;
    	let div8;
    	let div6;
    	let form0;
    	let fieldset0;
    	let legend0;
    	let t3;
    	let div3;
    	let label0;
    	let t5;
    	let input;
    	let t6;
    	let div4;
    	let label1;
    	let t8;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let t12;
    	let div5;
    	let button;
    	let t14;
    	let div7;
    	let form1;
    	let fieldset1;
    	let legend1;

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
    			form0 = element("form");
    			fieldset0 = element("fieldset");
    			legend0 = element("legend");
    			legend0.textContent = "Upload Image";
    			t3 = space();
    			div3 = element("div");
    			label0 = element("label");
    			label0.textContent = "Pick an image:";
    			t5 = space();
    			input = element("input");
    			t6 = space();
    			div4 = element("div");
    			label1 = element("label");
    			label1.textContent = "Characterset:";
    			t8 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Option 01 ";
    			option1 = element("option");
    			option1.textContent = "Option 02 ";
    			option2 = element("option");
    			option2.textContent = "Option 02";
    			t12 = space();
    			div5 = element("div");
    			button = element("button");
    			button.textContent = "Submit";
    			t14 = space();
    			div7 = element("div");
    			form1 = element("form");
    			fieldset1 = element("fieldset");
    			legend1 = element("legend");
    			legend1.textContent = "ASCII Art";
    			attr_dev(a, "href", "/");
    			attr_dev(a, "class", "no-style");
    			add_location(a, file, 7, 36, 148);
    			attr_dev(div0, "class", "logo terminal-prompt");
    			add_location(div0, file, 7, 2, 114);
    			attr_dev(div1, "class", "terminal-logo");
    			add_location(div1, file, 5, 1, 69);
    			attr_dev(div2, "class", "terminal-nav");
    			add_location(div2, file, 4, 0, 41);
    			add_location(legend0, file, 25, 4, 643);
    			attr_dev(label0, "for", "file");
    			add_location(label0, file, 27, 5, 707);
    			attr_dev(input, "id", "file");
    			attr_dev(input, "name", "file");
    			attr_dev(input, "type", "file");
    			add_location(input, file, 28, 5, 753);
    			attr_dev(div3, "class", "form-group");
    			add_location(div3, file, 26, 4, 677);
    			attr_dev(label1, "for", "select");
    			add_location(label1, file, 31, 5, 840);
    			option0.__value = " Option 01 ";
    			option0.value = option0.__value;
    			add_location(option0, file, 33, 5, 928);
    			option1.__value = " Option 02 ";
    			option1.value = option1.__value;
    			add_location(option1, file, 34, 5, 962);
    			option2.__value = " Option 02 ";
    			option2.value = option2.__value;
    			add_location(option2, file, 35, 5, 996);
    			attr_dev(select, "id", "select");
    			attr_dev(select, "name", "select");
    			add_location(select, file, 32, 5, 888);
    			attr_dev(div4, "class", "form-group");
    			add_location(div4, file, 30, 4, 810);
    			attr_dev(button, "class", "btn btn-default");
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "role", "button");
    			attr_dev(button, "name", "submit");
    			attr_dev(button, "id", "submit");
    			add_location(button, file, 40, 5, 1141);
    			attr_dev(div5, "class", "form-group");
    			add_location(div5, file, 38, 4, 1055);
    			add_location(fieldset0, file, 24, 4, 628);
    			attr_dev(form0, "action", "#");
    			attr_dev(form0, "method", "post");
    			attr_dev(form0, "enctype", "multipart/form-data");
    			add_location(form0, file, 23, 3, 561);
    			attr_dev(div6, "class", "column column-40 column-offset-10");
    			add_location(div6, file, 22, 2, 510);
    			add_location(legend1, file, 48, 4, 1408);
    			add_location(fieldset1, file, 47, 4, 1393);
    			attr_dev(form1, "action", "#");
    			attr_dev(form1, "method", "post");
    			attr_dev(form1, "enctype", "multipart/form-data");
    			add_location(form1, file, 46, 3, 1326);
    			attr_dev(div7, "class", "column column-40");
    			add_location(div7, file, 45, 2, 1292);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file, 21, 1, 490);
    			attr_dev(div9, "class", "container");
    			add_location(div9, file, 19, 0, 463);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, a);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div6);
    			append_dev(div6, form0);
    			append_dev(form0, fieldset0);
    			append_dev(fieldset0, legend0);
    			append_dev(fieldset0, t3);
    			append_dev(fieldset0, div3);
    			append_dev(div3, label0);
    			append_dev(div3, t5);
    			append_dev(div3, input);
    			append_dev(fieldset0, t6);
    			append_dev(fieldset0, div4);
    			append_dev(div4, label1);
    			append_dev(div4, t8);
    			append_dev(div4, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(fieldset0, t12);
    			append_dev(fieldset0, div5);
    			append_dev(div5, button);
    			append_dev(div8, t14);
    			append_dev(div8, div7);
    			append_dev(div7, form1);
    			append_dev(form1, fieldset1);
    			append_dev(fieldset1, legend1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div9);
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

    function instance($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	return [];
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
