const h = (tag, attrs, ...children) => {
  const elem = document.createElement(tag);
  Object.keys(attrs).forEach(key => elem[key] = attrs[key]);
  children.forEach(child => {
    if (typeof child === "string") {
      child = document.createTextNode(child);
    }
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
    this.onClose = props.onClose;
    this.onOpen = props.onOpen;
    this.users = props.users;
    if (!this.users || (this.users && this.users.length < 1)){
      return;
    }
    this.quill.root.setAttribute("data-gramm", false);
    this.container = this.quill.container.parentNode.querySelector(props.container);
    this.container = document.createElement("ul");
    this.container.classList.add("completions");
    this.quill.container.appendChild(this.container);
    this.container.style.position = "absolute";
    this.container.style.display = "none";
    this.onSelectionChange = this.maybeUnfocus.bind(this);
    this.onTextChange = this.update.bind(this);

    this.mentionBtnControl = document.createElement("div");
    this.mentionBtnControl.classList.add("textarea-mention-control");
    this.mentionBtnControl.style.position = "absolute";
    this.mentionBtnControl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 50 50"><path fill="#000" fill-rule="evenodd" d="M24.7 20.92c-1.67 0-2.65 1.33-2.65 3.56 0 2.22.98 3.57 2.62 3.57 1.67 0 2.72-1.36 2.72-3.57 0-2.2-1.06-3.56-2.7-3.56zm.5-9.58c7.47 0 12.6 4.72 12.6 11.6 0 4.98-2.36 8.1-6.14 8.1-1.96 0-3.38-.95-3.72-2.45h-.28c-.66 1.57-1.94 2.38-3.75 2.38-3.24 0-5.4-2.62-5.4-6.6 0-3.8 2.13-6.36 5.25-6.36 1.67 0 3.03.8 3.66 2.2h.3v-1.86h3.14v8.28c0 1.1.55 1.75 1.5 1.75 1.58 0 2.6-2 2.6-5.18 0-5.66-3.9-9.34-9.85-9.34-6.05 0-10.26 4.34-10.26 10.57 0 6.35 4.2 10.35 10.85 10.35 1.66 0 3.36-.2 4.24-.52v2.55c-1.22.36-2.83.56-4.5.56C17.32 37.4 12 32.2 12 24.37c0-7.72 5.4-13.04 13.2-13.04z"/></svg>';
    this.quill.container.appendChild(this.mentionBtnControl);
    this.mentionBtnControl.addEventListener("click", this.clickMentionBtn.bind(this),false);

    this.open = false;
    this.atIndex = null;
    this.focusedButton = null;
    this.currentPosition = null;
    this.prevUsers = null;

    quill.keyboard.addBinding({
      key: 50,
      shiftKey: true,
    }, this.onAtKey.bind(this));

    quill.keyboard.addBinding({
      key: 40,
      collapsed: true,
      format: ["mention"]
    }, this.handleArrow.bind(this, "ArrowDown"));

    quill.keyboard.addBinding({
      key: 38,
      collapsed: true,
      format: ["mention"]
    }, this.handleArrow.bind(this, "ArrowUp"));

    quill.keyboard.addBinding({
      key: 27,
      collapsed: true,
      format: ["mention"]
    }, this.handleEsc.bind(this, "ArrowUp"));

    quill.keyboard.addBinding({
      key: 13,
      collapsed: true
    }, this.handleEnter.bind(this));

    quill.keyboard.bindings[13].unshift(quill.keyboard.bindings[13].pop());
  }

  clickMentionBtn(){
    const users = this.users;
    if (!this.open) {
      this.quill.insertText(this.quill.selection.savedRange.index, "@", "", "0", Quill.sources.USER);
      this.quill.setSelection(this.quill.selection.savedRange.index + 1, 0, Quill.sources.SILENT);
    }

    this.renderMentionBox(users);
  }

  renderMentionBox(users) {
    this.open = !this.open;

    this.isBoxRender = true;
    let atSignBounds = this.quill.getBounds(this.quill.selection.savedRange.index);

    if ((atSignBounds.left + 230) > this.quill.container.offsetWidth) {
      this.container.style.left = "auto";
      this.container.style.right = 0;
    } else {
      this.container.style.left = atSignBounds.left + "px";
    }

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
    this.renderCompletions(this.users, true);

  }

  handleEsc() {
    this.close(null);
  }

  handleEnter() {
    if (this.open) return false;
    return true;
  }

  onAtKey(range) {
    let prevText = this.quill.getText(range.index-1, 1).trim();
    let nextText = this.quill.getText(range.index, 1).trim();
    // if (this.open) return true;
    if (this.open) {
      close(null);
    }
   
    if (range.length > 0) {
      this.quill.deleteText(range.index, range.length, Quill.sources.USER);
    }

    if (prevText || nextText) {
      this.quill.insertText(range.index, "@");
    } else {
      this.isBoxRender = false;
      this.quill.insertText(range.index, "@", "mention", "0", Quill.sources.USER);
      let atSignBounds = this.quill.getBounds(range.index);
      this.quill.setSelection(range.index + 1, Quill.sources.SILENT);
  
      this.atIndex = range.index;
  
      if ((atSignBounds.left + 230) > this.quill.container.offsetWidth) {
        this.container.style.left = "auto";
        this.container.style.right = 0;
      } else {
        this.container.style.left = atSignBounds.left + "px";
      }
  
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
      //this.open = true;
      this.quill.on("text-change", this.onTextChange);
      this.quill.once("selection-change", this.onSelectionChange);
      this.update();
      this.onOpen && this.onOpen();
    }
  }

  handleArrow(keyType) {
    if (!this.open) return true;

    if (this.currentPosition >= 0) {
      if (keyType === "ArrowDown") {
        this.currentPosition = Math.min(this.list.length - 1, this.currentPosition + 1);
        if (this.list[Math.min(this.list.length - 1, this.currentPosition) - 1]) {
          this.list[Math.min(this.list.length - 1, this.currentPosition) - 1].classList.remove("active");
        }
        this.list[Math.min(this.list.length - 1, this.currentPosition)].classList.add("active");
        var top = this.list[Math.min(this.list.length - 1, this.currentPosition)].offsetTop + this.list[Math.min(this.list.length - 1, this.currentPosition)].offsetHeight;
        if (top > this.container.offsetHeight) {
          this.container.scrollTop = top - this.container.offsetHeight;
        }
      } else if (keyType === "ArrowUp") {
        this.currentPosition = Math.max(0, this.currentPosition - 1);
        if (this.list[Math.max(0, this.currentPosition) + 1]) {
          this.list[Math.max(0, this.currentPosition) + 1].classList.remove("active");
        }
        this.list[Math.max(0, this.currentPosition)].classList.add("active");
        var top = this.list[Math.max(0, this.currentPosition)].offsetTop;
        if (this.container.offsetHeight < (this.container.scrollHeight - top)) {
          this.container.scrollTop = top;
        }
      }
    }
  }

  update(val) {
    const sel = this.quill.getSelection().index;
    if (this.atIndex >= sel) {
      return this.close(null);
    }
    this.query = this.quill.getText(this.atIndex + 1, sel - this.atIndex - 1);
    const users = this.users
      .filter(u => {
        if (u.username.indexOf(this.query) != -1){
          u.searchKey = "username";
          return u;
        } else if (u.fullName.indexOf(this.query) != -1) {
          u.searchKey = "name";
          return u;
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
    this.list = this.container.childNodes;
    while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
    const buttons = Array(users.length);
    this.buttons = buttons;
    const handler = () => event => {
      if (event.key === "Enter" || event.keyCode === 13
         || event.key === "Tab" || event.keyCode === 9
         || event.type === "click") {

        event.preventDefault();
        users.forEach((user, i) => {
          if(this.list[this.currentPosition] && this.list[this.currentPosition].id && user.id == this.list[this.currentPosition].id) {
            if (this.isBoxRender) {
              this.mentionBoxClose(user,(event.key === "Enter" || event.keyCode === 13) ? true: false,
                                    this.quill.getSelection(),
                                    (event.key === "Tab" || event.keyCode === 9) ? true: false);
            } else {
              this.close(user, (event.key === "Enter" || event.keyCode === 13) ? true: false, (event.key === "Tab" || event.keyCode === 9) ? true: false);
            }
          }
        });
      }
    };

    const mouseHandler = (i, user) => event => {
      this.currentPosition = i;
      this.list.forEach((list, i) => {
        if (list.classList.contains('active')) {
          list.classList.remove("active");
        }
      });
      this.list[i].classList.add("active");
    };

    users.forEach((user, i) => {
      const li = h("li", {},
        h("button", {type: "button"},
          h("span", {className: "matched"}, "@" + user.username),
          h("span", {className: "mention--name"}, user.fullName)
          // h("span", {className: "matched"}, "@" + (user.searchKey === 'username' ? (this.query + user.username.slice(this.query.length)) : user.username)),
          // h("span", {className: "mention--name"}, ' '+ (user.searchKey === 'name' ? (this.query + user.fullName.slice(this.query.length)) : user.fullName))
        )
      );
      this.container.appendChild(li);
      li.setAttribute("id", user.id);
      this.list[i].addEventListener("mouseenter", mouseHandler(i, user));
    });


    if (!this.open || !this.prevUsers || this.prevUsers.length !== users.length || this.currentPosition === null) {
      this.currentPosition = 0;
    }

    if (this.currentPosition >= 0 && this.list[this.currentPosition]) {
      this.list[this.currentPosition].classList.add("active");
    }


    if (!users.length) {
      this.open = false;
    } else if (!this.isBoxRender) {
      this.open = true;
    }

    this.list = this.container.childNodes;
    this.quill.container.addEventListener("keydown", handler(this));
    this.container.addEventListener("click", handler(this));
    if (this.open) {
      this.container.style.display = "block";
    }
    else{
      this.container.style.display = "none";
    }
    this.prevUsers = users;
  }

  close(value, isEnter, isTab) {
    this.container.scrollTop = 0;
    this.container.style.display = "none";
    while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
    this.quill.off("selection-change", this.onSelectionChange);
    this.quill.off("text-change", this.onTextChange);

    if (value) {
      const {label, username} = value;
    
      this.quill.deleteText(this.atIndex, this.query.length + 1, Quill.sources.USER);
      this.quill.insertText(this.atIndex, "@" + username, "mention", label, Quill.sources.USER);
      // this.quill.insertText(this.atIndex + username.length + 1, " ", "mention", false, Quill.sources.USER);
      this.quill.setSelection(this.atIndex + username.length + 1, 0, Quill.sources.SILENT);
    
      if (isTab) {
        this.quill.deleteText(this.atIndex + username.length + 1, 1, Quill.sources.USER);
      }

    }
    this.open = false;
    this.onClose && this.onClose(value);
  }

  mentionBoxClose(value, isEnter, range, isTab){
    this.container.scrollTop = 0;
    this.container.style.display = "none";
    while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
    this.quill.off("selection-change", this.onSelectionChange);
    this.quill.off("text-change", this.onTextChange);

    if (value) {
      const {label, username} = value;
      
      // this.quill.deleteText(range.index, 1, Quill.sources.USER);
      this.quill.insertText(range.index, username + ' ', "mention", label, Quill.sources.USER);
      // this.quill.insertText(range.index + username.length + 1, " ", "mention", false, Quill.sources.USER);
      this.quill.setSelection(range.index + username.length + 1, 0, Quill.sources.SILENT);
    
      if (isTab) {
        this.quill.deleteText(range.index-1, 1, Quill.sources.USER);
      }

    }

    this.open = false;
    this.onClose && this.onClose(value);
  }
}

Quill.register("modules/mentions", Mentions);
