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

const Inline = Quill.import("blots/inline");
class MentionBlot extends Inline {
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
    formats["mention"] = MentionBlot.formats(this.domNode);
    return formats;
  }
}

MentionBlot.blotName = "mention";
MentionBlot.tagName = "SPAN";
MentionBlot.className = "mention";

Quill.register({
  "formats/mention": MentionBlot
});

class Mentions {
  constructor(quill, props) {
    this.quill = quill;
    this.quill.root.setAttribute('data-gramm', false);
    this.onClose = props.onClose;
    this.onOpen = props.onOpen;
    this.users = props.users;
    if (!this.users) return;
    this.container = this.quill.container.parentNode.querySelector(props.container);
    this.container = document.createElement("ul");
    this.container.classList.add("completions");
    this.quill.container.appendChild(this.container);
    this.container.style.position   = "absolute";
    this.container.style.display    = "none";
    this.onSelectionChange = this.maybeUnfocus.bind(this);
    this.onTextChange = this.update.bind(this);

    this.mentionBtnControl  = document.createElement('div');
    this.mentionBtnControl.classList.add('textarea-mention-control');
    this.mentionBtnControl.style.position   = "absolute";
    this.mentionBtnControl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 50 50"><path fill="#000" fill-rule="evenodd" d="M24.7 20.92c-1.67 0-2.65 1.33-2.65 3.56 0 2.22.98 3.57 2.62 3.57 1.67 0 2.72-1.36 2.72-3.57 0-2.2-1.06-3.56-2.7-3.56zm.5-9.58c7.47 0 12.6 4.72 12.6 11.6 0 4.98-2.36 8.1-6.14 8.1-1.96 0-3.38-.95-3.72-2.45h-.28c-.66 1.57-1.94 2.38-3.75 2.38-3.24 0-5.4-2.62-5.4-6.6 0-3.8 2.13-6.36 5.25-6.36 1.67 0 3.03.8 3.66 2.2h.3v-1.86h3.14v8.28c0 1.1.55 1.75 1.5 1.75 1.58 0 2.6-2 2.6-5.18 0-5.66-3.9-9.34-9.85-9.34-6.05 0-10.26 4.34-10.26 10.57 0 6.35 4.2 10.35 10.85 10.35 1.66 0 3.36-.2 4.24-.52v2.55c-1.22.36-2.83.56-4.5.56C17.32 37.4 12 32.2 12 24.37c0-7.72 5.4-13.04 13.2-13.04z"/></svg>';
    this.quill.container.appendChild(this.mentionBtnControl);
    this.mentionBtnControl.addEventListener('click', this.clickMentionBtn.bind(this),false);

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

  clickMentionBtn(){
    const users = this.users;
    this.renderMentionBox(users);
  }

  renderMentionBox(users) {
    this.open = !this.open;
    while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
    const buttons = Array(users.length);
    this.buttons = buttons;
    const handler = (i, user) => event => {
      if (event.key === "ArrowDown" || event.keyCode === 40) {
        event.preventDefault();
        buttons[Math.min(buttons.length - 1, i + 1)].focus();
      } else if (event.key === "ArrowUp" || event.keyCode === 38) {
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
      const li = h("li", {},
        h("button", {type: "button"},
          h("span", {className: "matched"}, "@" + user.username),
          h("span", {className: "mention--name"}, user.fullName)
        )
      );
      this.container.appendChild(li);

      buttons[i] = li.firstChild;
      buttons[i].addEventListener("keydown", handler(i, user));
      buttons[i].addEventListener("mousedown", () => this.mentionBoxClose(user));
      // buttons[i].addEventListener("focus", () => this.focusedButton = i);
      // buttons[i].addEventListener("unfocus", () => this.focusedButton = null);
    });
    let atSignBounds = this.quill.getBounds(this.quill.selection.savedRange.index);
    this.container.style.left = atSignBounds.left + "px";
    let windowHeight = window.innerHeight;
    let editorPos = this.quill.container.getBoundingClientRect().top;

    if (editorPos > windowHeight / 2) {
      this.container.style.top = "auto";
      this.container.style.bottom = atSignBounds.top + atSignBounds.height + 15 + "px";
    } else {
      this.container.style.top = atSignBounds.top + atSignBounds.height + 15 + "px";
      this.container.style.bottom = "auto";
    }

    this.container.style.zIndex = 99;
    if (this.open) {
      this.container.style.display = "block";
    }
    else{
      this.container.style.display = "none";
    }

  }

  onAtKey(range) {
    if (this.open) return true;
    if (range.length > 0) {
      this.quill.deleteText(range.index, range.length, Quill.sources.USER);
    }
    this.quill.insertText(range.index, "@", "mention", "0", Quill.sources.USER);
    let atSignBounds = this.quill.getBounds(range.index);
    this.quill.setSelection(range.index + 1, Quill.sources.SILENT);

    this.atIndex = range.index;
    this.container.style.left = atSignBounds.left + "px";
    let windowHeight = window.innerHeight;
    let editorPos = this.quill.container.getBoundingClientRect().top;

    if (editorPos > windowHeight / 2) {
      this.container.style.top = "auto";
      this.container.style.bottom = atSignBounds.top + atSignBounds.height + 15 + "px";
    } else {
      this.container.style.top = atSignBounds.top + atSignBounds.height + 15 + "px";
      this.container.style.bottom = "auto";
    }

    this.container.style.zIndex = 99;
    this.open = true;
    this.quill.on("text-change", this.onTextChange);
    this.quill.once("selection-change", this.onSelectionChange);
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
      .filter(u => {
        const searchPattern = new RegExp(this.query, "gi");
        if (searchPattern.test(u.username)){
          return u.username;
        } else if (searchPattern.test(u.fullName)) {
          return u.fullName;
        }
      })
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
      if (event.key === "ArrowDown" || event.keyCode === 40) {
        event.preventDefault();
        buttons[Math.min(buttons.length - 1, i + 1)].focus();
      } else if (event.key === "ArrowUp" || event.keyCode === 38) {
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
      const li = h("li", {},
        h("button", {type: "button"},
          h("span", {className: "matched"}, "@" + this.query + user.username.slice(this.query.length)),
          h("span", {className: "mention--name"}, user.fullName)
        )
      );
      this.container.appendChild(li);

      buttons[i] = li.firstChild;
      buttons[i].addEventListener("keydown", handler(i, user));
      buttons[i].addEventListener("mousedown", () => this.close(user));
      buttons[i].addEventListener("focus", () => this.focusedButton = i);
      buttons[i].addEventListener("unfocus", () => this.focusedButton = null);
    });
    this.container.style.display = "block";
  }

  close(value) {
    this.container.style.display = "none";
    while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
    this.quill.off("selection-change", this.onSelectionChange);
    this.quill.off("text-change", this.onTextChange);
    if (value) {
      const {label, username} = value;
      this.quill.deleteText(this.atIndex, this.query.length + 1, Quill.sources.USER);
      this.quill.insertText(this.atIndex, "@" + username, "mention", label, Quill.sources.USER);
      this.quill.insertText(this.atIndex + username.length + 1, " ", "mention", false, Quill.sources.USER);
      this.quill.setSelection(this.atIndex + username.length + 2, 0, Quill.sources.SILENT);
    }
    this.quill.focus();
    this.open = false;
    this.onClose && this.onClose(value);
  }

  mentionBoxClose(value){
    let range = this.quill.getSelection();
    if (value) {
      const {label, username} = value;
      this.quill.insertText(this.quill.selection.savedRange.index, "@" + username, "mention", label, Quill.sources.USER);
      this.quill.insertText(this.quill.selection.savedRange.index + username.length + 1, " ", "mention", false, Quill.sources.USER);
      this.quill.setSelection(this.quill.selection.savedRange.index + username.length + 2, 0, Quill.sources.SILENT);
    }
    this.container.style.display = "none";
    this.quill.focus();
  }

}
Quill.register("modules/mentions", Mentions);
