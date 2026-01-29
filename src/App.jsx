import React, { useState, useEffect } from 'react';
import { diffLines, diffWords } from 'diff';
import { Document, Packer, Paragraph, TextRun } from 'docx';

function hybridDiff(oldText, newText) {
  const lineDiff = diffLines(oldText, newText);
  const result = [];

  for (let i = 0; i < lineDiff.length; i++) {
    const part = lineDiff[i];
    const next = lineDiff[i + 1];

    if (part.removed && next?.added) {
      const wordDiff = diffWords(part.value, next.value);
      wordDiff.forEach(w => {
        if (w.added) result.push({ type: 'added', value: w.value });
        else if (w.removed) result.push({ type: 'removed', value: w.value });
        else result.push({ type: 'same', value: w.value });
      });
      i++;
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
  const [viewMode, setViewMode] = useState('hybrid'); // hybrid | diffWords | diffLines | doc1 | doc2

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

  /* ================= HYBRID (UNCHANGED) ================= */

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

  /* ================= Original Documents ================= */

  const renderDocument1 = () => {
    const lines = content1.split('\n');
    const elements = [];
    
    // Add document header
    elements.push(
      <div key="header" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontWeight: 'bold' }}>UPFRONT FEE LETTER</h2>
      </div>
    );
    
    elements.push(<br key="spacer" />);
    
    // Collect all list items for a single ordered list
    let allListItems = [];
    let listStarted = false;

    // Process each line
    lines.forEach((line, index) => {
      if (line.trim() === '') {
        elements.push(<br key={`br-${index}`} />);
        return;
      }

      const isNumberedLine = /^\d+\./.test(line);

      if (isNumberedLine) {
        listStarted = true;
        const cleanText = line.replace(/^\d+\.\s*/, '');
        allListItems.push(
          <li key={`item-${index}`} style={{ marginBottom: '8px' }}>
            {cleanText}
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
            {line.startsWith('**') && line.endsWith('**') ? line.replace(/\*\*/g, '') : line}
          </div>
        );
      }
    });

    // Close any remaining open list
    if (listStarted && allListItems.length > 0) {
      elements.push(
        <ol key="final-list" style={{ marginLeft: '40px', paddingLeft: '20px' }}>
          {allListItems}
        </ol>
      );
    }

    return <div>{elements}</div>;
  };

  const renderDocument2 = () => {
    const lines = content2.split('\n');
    const elements = [];
    
    // Add document header
    elements.push(
      <div key="header" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontWeight: 'bold' }}>UPFRONT FEE LETTER</h2>
      </div>
    );
    
    elements.push(<br key="spacer" />);
    
    // Collect all list items for a single ordered list
    let allListItems = [];
    let listStarted = false;

    // Process each line
    lines.forEach((line, index) => {
      if (line.trim() === '') {
        elements.push(<br key={`br-${index}`} />);
        return;
      }

      const isNumberedLine = /^\d+\./.test(line);
      const hasTrackChanges = line.includes('⟪DEL⟫') || line.includes('⟪INS⟫');

      if (isNumberedLine) {
        listStarted = true;
        
        if (hasTrackChanges) {
          // Process track changes inline
          const processedLine = line
            .replace(/⟪DEL⟫(.*?)⟪\/DEL⟫/g, '<span style="color: #721c24; text-decoration: line-through; background-color: #f8d7da; padding: 2px 4px; border-radius: 3px;">$1</span>')
            .replace(/⟪INS⟫(.*?)⟪\/INS⟫/g, '<span style="color: #155724; background-color: #d4edda; padding: 2px 4px; border-radius: 3px;">$1</span>')
            .replace(/⟪DEL⟫/g, '<span style="color: #721c24; text-decoration: line-through; background-color: #f8d7da; padding: 2px 4px; border-radius: 3px;">')
            .replace(/⟪\/DEL⟫/g, '</span>')
            .replace(/⟪INS⟫/g, '<span style="color: #155724; background-color: #d4edda; padding: 2px 4px; border-radius: 3px;">')
            .replace(/⟪\/INS⟫/g, '</span>');
          
          const cleanText = processedLine.replace(/^\d+\.\s*/, '');
          allListItems.push(
            <li key={`item-${index}`} style={{ marginBottom: '8px' }}>
              <span dangerouslySetInnerHTML={{ __html: cleanText }} />
            </li>
          );
        } else {
          const cleanText = line.replace(/^\d+\.\s*/, '');
          allListItems.push(
            <li key={`item-${index}`} style={{ marginBottom: '8px' }}>
              {cleanText}
            </li>
          );
        }
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

        if (hasTrackChanges) {
          const processedLine = line
            .replace(/⟪DEL⟫(.*?)⟪\/DEL⟫/g, '<span style="color: #721c24; text-decoration: line-through; background-color: #f8d7da; padding: 2px 4px; border-radius: 3px;">$1</span>')
            .replace(/⟪INS⟫(.*?)⟪\/INS⟫/g, '<span style="color: #155724; background-color: #d4edda; padding: 2px 4px; border-radius: 3px;">$1</span>')
            .replace(/⟪DEL⟫/g, '<span style="color: #721c24; text-decoration: line-through; background-color: #f8d7da; padding: 2px 4px; border-radius: 3px;">')
            .replace(/⟪\/DEL⟫/g, '</span>')
            .replace(/⟪INS⟫/g, '<span style="color: #155724; background-color: #d4edda; padding: 2px 4px; border-radius: 3px;">')
            .replace(/⟪\/INS⟫/g, '</span>');
          
          elements.push(
            <div key={`line-${index}`} style={{ marginBottom: '12px' }}>
              <span dangerouslySetInnerHTML={{ __html: processedLine.startsWith('**') && processedLine.endsWith('**') ? processedLine.replace(/\*\*/g, '') : processedLine }} />
            </div>
          );
        } else {
          elements.push(
            <div key={`line-${index}`} style={{ marginBottom: '12px' }}>
              {line.startsWith('**') && line.endsWith('**') ? line.replace(/\*\*/g, '') : line}
            </div>
          );
        }
      }
    });

    // Close any remaining open list
    if (listStarted && allListItems.length > 0) {
      elements.push(
        <ol key="final-list" style={{ marginLeft: '40px', paddingLeft: '20px' }}>
          {allListItems}
        </ol>
      );
    }

    return <div>{elements}</div>;
  };

  /* ================= diffWords ================= */

  const renderDiffWords = () => {
    const cleaned2 = cleanTrackChanges(content2);
    const diff = diffWords(content1, cleaned2);

    return diff.map((part, i) => {
      if (part.added) {
        return <span key={i} style={{ background: '#d4edda', color: '#155724' }}>{part.value}</span>;
      } else if (part.removed) {
        return <span key={i} style={{ background: '#f8d7da', color: '#721c24', textDecoration: 'line-through' }}>{part.value}</span>;
      } else {
        return <span key={i}>{part.value}</span>;
      }
    });
  };

  /* ================= diffLines ================= */

  const renderDiffLines = () => {
    const cleaned2 = cleanTrackChanges(content2);
    const diff = diffLines(content1, cleaned2);

    return diff.map((part, i) => {
      if (part.added) {
        return <div key={i} style={{ background: '#d4edda', color: '#155724' }}>+ {part.value}</div>;
      } else if (part.removed) {
        return <div key={i} style={{ background: '#f8d7da', color: '#721c24' }}>- {part.value}</div>;
      } else {
        return <div key={i}>{part.value}</div>;
      }
    });
  };

  /* ================= UI ================= */

  const getButtonStyle = (mode) => ({
    padding: '10px 20px',
    border: '2px solid #007bff',
    borderRadius: '8px',
    backgroundColor: viewMode === mode ? '#007bff' : '#ffffff',
    color: viewMode === mode ? '#ffffff' : '#007bff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: viewMode === mode ? '600' : '400',
    transition: 'all 0.3s ease',
    marginRight: '12px',
    boxShadow: viewMode === mode ? '0 4px 12px rgba(0, 123, 255, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
    transform: viewMode === mode ? 'translateY(-2px)' : 'translateY(0)'
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#333', marginBottom: '10px' }}>Legal Document Comparison</h1>
        <p style={{ color: '#666', fontSize: '16px' }}>Comparing two versions of the UPFRONT FEE LETTER</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setViewMode('diffWords')} 
          style={getButtonStyle('diffWords')}
          onMouseEnter={(e) => {
            if (viewMode !== 'diffWords') {
              e.target.style.backgroundColor = '#f8f9ff';
              e.target.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== 'diffWords') {
              e.target.style.backgroundColor = '#ffffff';
              e.target.style.transform = 'translateY(0)';
            }
          }}
        >
          📝 Differ by Words
        </button>
        <button 
          onClick={() => setViewMode('diffLines')} 
          style={getButtonStyle('diffLines')}
          onMouseEnter={(e) => {
            if (viewMode !== 'diffLines') {
              e.target.style.backgroundColor = '#f8f9ff';
              e.target.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== 'diffLines') {
              e.target.style.backgroundColor = '#ffffff';
              e.target.style.transform = 'translateY(0)';
            }
          }}
        >
          📄 Differ by Lines
        </button>
        <button 
          onClick={() => setViewMode('hybrid')} 
          style={getButtonStyle('hybrid')}
          onMouseEnter={(e) => {
            if (viewMode !== 'hybrid') {
              e.target.style.backgroundColor = '#f8f9ff';
              e.target.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== 'hybrid') {
              e.target.style.backgroundColor = '#ffffff';
              e.target.style.transform = 'translateY(0)';
            }
          }}
        >
          🔄 Hybrid (Recommended)
        </button>
        <button 
          onClick={() => setViewMode('doc1')} 
          style={getButtonStyle('doc1')}
          onMouseEnter={(e) => {
            if (viewMode !== 'doc1') {
              e.target.style.backgroundColor = '#f8f9ff';
              e.target.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== 'doc1') {
              e.target.style.backgroundColor = '#ffffff';
              e.target.style.transform = 'translateY(0)';
            }
          }}
        >
          📄 Document 1 (Original)
        </button>
        <button 
          onClick={() => setViewMode('doc2')} 
          style={getButtonStyle('doc2')}
          onMouseEnter={(e) => {
            if (viewMode !== 'doc2') {
              e.target.style.backgroundColor = '#f8f9ff';
              e.target.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== 'doc2') {
              e.target.style.backgroundColor = '#ffffff';
              e.target.style.transform = 'translateY(0)';
            }
          }}
        >
          📝 Document 2 (With Changes)
        </button>
      </div>

      {isProcessing && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ 
            display: 'inline-block', 
            padding: '20px 40px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>🔄 Processing comparison...</p>
          </div>
        </div>
      )}

      {!isProcessing && (
        <div style={{ 
          background: 'white', 
          padding: '30px', 
          border: '1px solid #ddd', 
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          whiteSpace: 'pre-wrap',
          minHeight: '400px'
        }}>
          <div style={{ 
            marginBottom: '20px', 
            paddingBottom: '15px', 
            borderBottom: '1px solid #eee',
            color: '#666',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {viewMode === 'hybrid' && '🔄 HYBRID: Line-level diff with word-level precision'}
            {viewMode === 'diffWords' && '📝 WORDS: Character-level comparison'}
            {viewMode === 'diffLines' && '📄 LINES: Line-by-line comparison'}
            {viewMode === 'doc1' && '📄 DOCUMENT 1: Original markdown1.md content'}
            {viewMode === 'doc2' && '📝 DOCUMENT 2: Original markdown2.md content with track changes'}
          </div>
          
          <div style={{ lineHeight: '1.6' }}>
            {viewMode === 'hybrid' && renderGoogleDocsStyleDiff()}
            {viewMode === 'diffWords' && renderDiffWords()}
            {viewMode === 'diffLines' && renderDiffLines()}
            {viewMode === 'doc1' && renderDocument1()}
            {viewMode === 'doc2' && renderDocument2()}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
