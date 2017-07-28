const h = (tag, attrs, ...children) => {
    const elem = document.createElement(tag);
    Object.keys(attrs).forEach(key => elem[key] = attrs[key]);
    children.forEach(child => {
        if (typeof child === "string")
            child = document.createTextNode(child);
        elem.appendChild(child);
    });
    return elem;
};

const Inline = Quill.import('blots/inline');
export class MentionBlot extends Inline {
        static create(label) {
            const node = super.create();
            node.dataset.label = label;
            return node;
        }
        static formats(node) {
            return node.dataset.label;
        }
        format(name, value) {
            if (name === "mention" && value) {
                this.domNode.dataset.label = value;
            } else {
                super.format(name, value);
            }
        }

        formats() {
            const formats = super.formats();
            formats['mention'] = MentionBlot.formats(this.domNode);
            return formats;
        }
    }

MentionBlot.blotName = "mention";
MentionBlot.tagName = "SPAN";
MentionBlot.className = "mention";

Quill.register({
    'formats/mention': MentionBlot
});

class Mentions {
    constructor(quill, props) {
        this.quill = quill;
        this.onClose = props.onClose;
        this.onOpen = props.onOpen;
        this.users = props.users;
        if (!this.users) return;
        this.container = this.quill.container.parentNode.querySelector(props.container);
        this.container = document.createElement("ul");
        this.container.classList.add('completions');
        this.quill.container.appendChild(this.container);
        this.container.style.position   = "absolute";
        this.container.style.display    = "none";
        this.onSelectionChange = this.maybeUnfocus.bind(this);
        this.onTextChange = this.update.bind(this);

        this.open = false;
        this.atIndex = null;
        this.focusedButton = null;

        quill.keyboard.addBinding({
            key: 50,
            shiftKey: true,
        }, this.onAtKey.bind(this));

        quill.keyboard.addBinding({
            key: 40,
            collapsed: true,
            format: ["mention"]
        }, this.handleArrow.bind(this));

        quill.keyboard.addBinding({
            key: 38,
            collapsed: true,
            format: ["mention"]
        }, this.handleArrow.bind(this));
    }

    onAtKey(range, context) {
        if (this.open) return true;
        if (range.length > 0) {
            this.quill.deleteText(range.index, range.length, Quill.sources.USER);
        }
        this.quill.insertText(range.index, "@", "mention", "0", Quill.sources.USER);
        let atSignBounds = this.quill.getBounds(range.index);
        this.quill.setSelection(range.index + 1, Quill.sources.SILENT);
        
        this.atIndex = range.index;
        this.container.style.left = atSignBounds.left + "px";
        this.container.style.top = atSignBounds.top + atSignBounds.height + "px";
        let windowHeight = window.innerHeight;
        let editorPos = this.quill.container.getBoundingClientRect().top;

        if (editorPos > windowHeight/2) {
            let top = atSignBounds.top - 78;
            this.container.style.top = top + "px";
        }
        this.container.style.zIndex = 99;
        this.open = true;

        this.quill.on('text-change', this.onTextChange);
        this.quill.once('selection-change', this.onSelectionChange);
        this.update();
        this.onOpen && this.onOpen();
    }

    handleArrow() {
        if (!this.open) return true;
        this.buttons[0].focus();
    }

    update() {
        const sel = this.quill.getSelection().index;
        if (this.atIndex >= sel) { 
            return this.close(null);
        }
        this.query = this.quill.getText(this.atIndex + 1, sel - this.atIndex - 1);
        const users = this.users
              .filter(u => u.username.startsWith(this.query))
              .sort((u1, u2) => u1.username > u2.username);
        this.renderCompletions(users);
    }

    maybeUnfocus() {
      if (this.container.querySelector("*:focus")) return;
      this.close(null);
    }

    renderCompletions(users) {
        while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
        const buttons = Array(users.length);
        this.buttons = buttons;
        const handler = (i, user) => event => {
            if (event.key === "ArrowRight" || event.keyCode === 39) {
                event.preventDefault();
                buttons[Math.min(buttons.length - 1, i + 1)].focus();
            } else if (event.key === "ArrowLeft" || event.keyCode === 37) {
                event.preventDefault();
                buttons[Math.max(0, i - 1)].focus();
            } else if (event.key === "Enter" || event.keyCode === 13
                       || event.key === " " || event.keyCode === 32
                       || event.key === "Tab" || event.keyCode === 9) {
                event.preventDefault();
                this.close(user);
            }
        };
        users.forEach((user, i) => {
            const li = h('li', {},
                         h('button', {type: "button"},
                           h('span', {className: "matched"}, "@" + this.query),
                           h('span', {className: "unmatched"}, user.username.slice(this.query.length))));
            this.container.appendChild(li);

            buttons[i] = li.firstChild;
            buttons[i].addEventListener('keydown', handler(i, user));
            buttons[i].addEventListener("mousedown", () => this.close(user));
            buttons[i].addEventListener("focus", () => this.focusedButton = i);
            buttons[i].addEventListener("unfocus", () => this.focusedButton = null);
        });
        this.container.style.display = "block";
    }

    close(value) {
        this.container.style.display = "none";
        while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
        this.quill.off('selection-change', this.onSelectionChange);
        this.quill.off('text-change', this.onTextChange);
        if (value) {
            const {label, username} = value;
            this.quill.deleteText(this.atIndex, this.query.length + 1, Quill.sources.USER);
            this.quill.insertText(this.atIndex, "@" + username, "mention", label, Quill.sources.USER);
            this.quill.insertText(this.atIndex + username.length + 1, " ", 'mention', false, Quill.sources.USER);
            this.quill.setSelection(this.atIndex + username.length + 2, 0, Quill.sources.SILENT);
        }
        this.quill.focus();
        this.open = false;
        this.onClose && this.onClose(value);
    }

}
Quill.register('modules/mentions', Mentions);
