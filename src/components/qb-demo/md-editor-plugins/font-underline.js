import { PluginComponent } from "react-markdown-editor-lite";

class FontUnderline extends PluginComponent {
  static pluginName = "fontUnderline";

  static align = "left";

  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);

    this.handleKeyboard = {
      key: "u",
      keyCode: 85,
      withKey: ["ctrlKey"],
      callback: this.handleClick
    };
  }

  handleClick() {
    const selection = this.editor.getSelection();
    if (selection.text) {
      this.editor.insertText(`<u>${selection.text}</u>`, true);
    } else {
      this.editor.insertText("<u></u>");
    }
  }

  componentDidMount() {
    if (this.editorConfig.shortcuts) {
      this.editor.onKeyboard(this.handleKeyboard);
    }
  }

  componentWillUnmount() {
    this.editor.offKeyboard(this.handleKeyboard);
  }

  render() {
    return (
      <span
        className="button button-type-font-underline"
        title="Underline"
        onClick={this.handleClick}>
        <strong>
          <u>U</u>
        </strong>
      </span>
    );
  }
}

export default FontUnderline;