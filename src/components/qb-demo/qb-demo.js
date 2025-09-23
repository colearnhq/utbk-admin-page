import { useState, useEffect } from "react";
import MdEditor, { Plugins } from "react-markdown-editor-lite";
import "react-markdown-editor-lite/lib/index.css";
import { initializeMathJax, processMathJax } from "./helper/mathjax-helper";
import FontUnderline from "./md-editor-plugins/font-underline";
import LatexInline from "./md-editor-plugins/latex-inline";
import LatexBlock from "./md-editor-plugins/latex-block";
import { toHtml } from "./helper/markdown-helper";

function QbDemo() {
  const [input, setInput] = useState("");

  useEffect(() => {
    initializeMathJax();
    MdEditor.use(FontUnderline);
    MdEditor.use(LatexInline);
    MdEditor.use(LatexBlock);
  }, []);

  useEffect(() => {
    processMathJax();
  }, [input]);

  const renderHtml = (text) => {
    const htmlText = toHtml(text);
    return htmlText;
  };

  const onChange = ({ text }) => {
    setInput(text);
  };

  return (
    <div>
      <h1>Question Bank Demo</h1>
      <MdEditor
        value={input}
        style={{ height: "700px" }}
        renderHTML={renderHtml}
        onChange={onChange}
        plugins={[
          Plugins.Header.pluginName,
          Plugins.FontBold.pluginName,
          Plugins.FontItalic.pluginName,
          Plugins.FontStrikethrough.pluginName,
          Plugins.ListUnordered.pluginName,
          Plugins.ListOrdered.pluginName,
          Plugins.BlockQuote.pluginName,
          Plugins.BlockCodeInline.pluginName,
          Plugins.BlockCodeBlock.pluginName,
          Plugins.Image.pluginName,
          Plugins.Link.pluginName,
          Plugins.Logger.pluginName,
          Plugins.FullScreen.pluginName,
          Plugins.Table.pluginName,
          FontUnderline.pluginName,
          LatexInline.pluginName,
          LatexBlock.pluginName,
        ]}
      />
    </div>
  );
}

export default QbDemo;
