import React, { useState, useEffect } from 'react';
import { diffLines, diffWords } from 'diff';
import { Document, Packer, Paragraph, TextRun } from 'docx';

function hybridDiff(oldText, newText) {
  const lineDiff = diffLines(oldText, newText);
  const result = [];

  for (let i = 0; i < lineDiff.length; i++) {
    const part = lineDiff[i];
    const next = lineDiff[i + 1];

    // Replacement: removed followed by added
    if (part.removed && next?.added) {
      const wordDiff = diffWords(part.value, next.value);
      wordDiff.forEach(w => {
        if (w.added) result.push({ type: 'added', value: w.value });
        else if (w.removed) result.push({ type: 'removed', value: w.value });
        else result.push({ type: 'same', value: w.value });
      });
      i++; // skip next
    } else if (part.added) {
      result.push({ type: 'added', value: part.value });
    } else if (part.removed) {
      result.push({ type: 'removed', value: part.value });
    } else {
      result.push({ type: 'same', value: part.value });
    }
  }

  return result;
}

function App() {
  const [content1, setContent1] = useState('');
  const [content2, setContent2] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState('diff');

  useEffect(() => {
    const loadFiles = async () => {
      setIsProcessing(true);
      const [r1, r2] = await Promise.all([
        fetch('/markdown1.md'),
        fetch('/markdown2.md')
      ]);
      const [t1, t2] = await Promise.all([r1.text(), r2.text()]);
      setContent1(t1);
      setContent2(t2);
      setIsProcessing(false);
    };
    loadFiles();
  }, []);

  const cleanTrackChanges = (text) =>
    text
      .replace(/⟪DEL⟫.*?⟪\/DEL⟫/gs, '')
      .replace(/⟪INS⟫(.*?)⟪\/INS⟫/gs, '$1')
      .replace(/⟪INS⟫|⟪\/INS⟫/g, '');

  const renderGoogleDocsStyleDiff = () => {
    if (!content1 || !content2) return null;

    const originalLines = content1.split('\n');
    const modifiedLines = cleanTrackChanges(content2).split('\n');

    const elements = [];
    let allListItems = [];
    let listStarted = false;

    originalLines.forEach((line, index) => {
      if (line.trim() === '') {
        elements.push(<br key={`br-${index}`} />);
        return;
      }

      const modifiedLine = modifiedLines[index] || '';
      const hasChanges = modifiedLine !== line;
      const isNumberedLine = /^\d+\./.test(line);

      const renderInlineDiff = () => {
        const diffResult = hybridDiff(line, modifiedLine);
        return diffResult.map((part, i) => {
          if (part.type === 'added') {
            return (
              <span key={i} style={{ backgroundColor: '#d4edda', color: '#155724' }}>
                {part.value}
              </span>
            );
          } else if (part.type === 'removed') {
            return (
              <span key={i} style={{ backgroundColor: '#f8d7da', color: '#721c24', textDecoration: 'line-through' }}>
                {part.value}
              </span>
            );
          } else {
            return <span key={i}>{part.value}</span>;
          }
        });
      };

      if (isNumberedLine) {
        listStarted = true;
        allListItems.push(
          <li key={`item-${index}`} style={{ marginBottom: '8px' }}>
            {hasChanges ? renderInlineDiff() : line.replace(/^\d+\.\s*/, '')}
          </li>
        );
      } else {
        if (listStarted && allListItems.length > 0) {
          elements.push(
            <ol key={`list-${index}`} style={{ marginLeft: '40px', paddingLeft: '20px' }}>
              {allListItems}
            </ol>
          );
          allListItems = [];
          listStarted = false;
        }

        elements.push(
          <div key={`line-${index}`} style={{ marginBottom: '12px' }}>
            {hasChanges ? renderInlineDiff() : line}
          </div>
        );
      }
    });

    if (listStarted && allListItems.length > 0) {
      elements.push(
        <ol key="final-list" style={{ marginLeft: '40px', paddingLeft: '20px' }}>
          {allListItems}
        </ol>
      );
    }

    return <div>{elements}</div>;
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Legal Document Comparison</h1>

      <div style={{ marginBottom: '10px' }}>
        <button onClick={() => setViewMode('diff')} style={{ marginRight: '8px' }}>
          Show Diff
        </button>
        <button onClick={() => setViewMode('preview')} style={{ marginRight: '8px' }}>
          Preview
        </button>
      </div>

      {isProcessing && <p>Processing...</p>}

      {!isProcessing && (
        <div style={{ background: 'white', padding: '20px', border: '1px solid #ddd' }}>
          {renderGoogleDocsStyleDiff()}
        </div>
      )}
    </div>
  );
}

export default App;
