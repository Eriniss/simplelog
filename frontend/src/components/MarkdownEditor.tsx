import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './MarkdownEditor.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = '마크다운을 입력하세요...'
}) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <div className="editor-container">
        <div className="editor-pane">
          <div className="editor-header">
            <span className="editor-label">Markdown 편집</span>
            <button
              type="button"
              className="editor-help-btn"
              onClick={() => setShowHelp(true)}
            >
              ?
            </button>
          </div>
          <textarea
            className="markdown-editor"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required
          />
        </div>

        <div className="preview-pane">
          <div className="preview-header">
            <span className="preview-label">미리보기</span>
          </div>
          <div className="markdown-preview">
            {value ? (
              <CustomReactMarkdown contents={value} />
            ) : (
              <p className="preview-placeholder">미리보기가 여기에 표시됩니다</p>
            )}
          </div>
        </div>
      </div>

      {/* Markdown Help Modal */}
      {showHelp && (
        <div className="modal" onClick={() => setShowHelp(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>마크다운 사용법</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowHelp(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body markdown-help-content">
              <h4># 헤딩 1</h4>
              <h4>## 헤딩 2</h4>
              <h4>### 헤딩 3</h4>
              <hr />
              <p><strong>**굵은 글씨**</strong> 또는 <strong>__굵은 글씨__</strong></p>
              <p><em>*기울임*</em> 또는 <em>_기울임_</em></p>
              <p><code>`인라인 코드`</code></p>
              <hr />
              <p>```language<br />코드 블록<br />```</p>
              <hr />
              <p>- 순서 없는 리스트<br />- 항목 2</p>
              <p>1. 순서 있는 리스트<br />2. 항목 2</p>
              <hr />
              <p>[링크](https://example.com)</p>
              <p>![이미지](image-url.jpg)</p>
              <hr />
              <p>&gt; 인용구</p>
              <hr />
              <p>| 헤더1 | 헤더2 |<br />|-------|-------|<br />| 셀1   | 셀2   |</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface CustomReactMarkdownProps {
  contents: string;
}

export const CustomReactMarkdown: React.FC<CustomReactMarkdownProps> = ({ contents }) => {
  return (
    <ReactMarkdown
      children={contents}
      remarkPlugins={[remarkGfm]}
      components={{
        // 1. 헤딩 크기 강제 적용
        h1: ({ children }) => <h1 className="text-4xl font-extrabold mt-8 mb-4">{children}</h1>,
        h2: ({ children }) => <h2 className="text-3xl font-bold mt-6 mb-3 pb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-2xl font-bold mt-6 mb-3 pb-2">{children}</h3>,
        // 2. 리스트 심볼 추가
        ul: ({ children }) => <ul className="list-disc pl-5 my-4 space-y-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 my-4 space-y-2">{children}</ol>,
        // 3. 표 테두리 추가
        table: ({ children }) => <table className="border border-gray-400 w-full my-4">{children}</table>,
        th: ({ children }) => <th className="border border-gray-300 p-2 bg-gray-100">{children}</th>,
        td: ({ children }) => <td className="border border-gray-300 p-2">{children}</td>,
        // 4. 인라인 코드 (백틱 한 개: `code`)
        code: ({ className, children }) => {
          // 코드 블럭인 경우 className이 'language-xxx' 형태로 들어옴
          const isCodeBlock = className && className.startsWith('language-');

          if (isCodeBlock) {
            // 코드 블럭: 언어 정보 추출
            const language = className?.replace('language-', '') || 'text';
            return (
              <div className="relative my-4">
                <div className="absolute top-2 right-2 text-xs text-gray-400 uppercase font-mono">{language}</div>
                <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto rounded-lg">
                  <code className={className}>{children}</code>
                </pre>
              </div>
            );
          } else {
            // 인라인 코드: 백틱 한 개로 감싼 경우
            return <code className="bg-gray-200 text-pink-600 px-2 py-1 rounded text-sm font-mono">{children}</code>;
          }
        },
        // 5. 인용구 (blockquote)
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 italic text-gray-700 bg-blue-50">
            {children}
          </blockquote>
        ),
        // 6. 수평선
        hr: () => <hr className="my-8 border-t-2 border-gray-300" />,
        // 7. 링크
        a: ({ children, href }) => (
          <a
            href={href}
            className="text-blue-600 hover:text-blue-800 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        // 8. 강조 (bold, italic)
        strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
        em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
        // 9. 단락
        p: ({ children }) => <p className="my-4 leading-7">{children}</p>,
      }}
    />
  );
};
