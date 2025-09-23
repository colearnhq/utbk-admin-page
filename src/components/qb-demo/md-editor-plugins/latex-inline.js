import { PluginComponent } from "react-markdown-editor-lite";

class LatexInline extends PluginComponent {
  static pluginName = "latexInline";

  static align = "left";

  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);

    this.handleKeyboard = {
      key: "l",
      keyCode: 76,
      withKey: ["ctrlKey"],
      callback: this.handleClick
    };
  }

  handleClick() {
    const selection = this.editor.getSelection();
    if (selection.text) {
      this.editor.insertText(`$${selection.text}$`, true);
    } else {
      this.editor.insertText("$$");
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
        title="Inline LaTeX"
        onClick={this.handleClick}>
        Σ
      </span>
    );
  }
}

export default LatexInline;