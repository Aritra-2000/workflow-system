import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import { Bold, Italic, List, ListOrdered, Heading2 } from 'lucide-react'

export default function RichTextEditor({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (value: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm w-full outline-none min-h-[80px] px-3 py-2 text-sm',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  })

  // Re-sync value if it gets cleared from the outside
  useEffect(() => {
    if (editor && value === '' && editor.getHTML() !== '<p></p>') {
      editor.commands.clearContent();
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border-2 border-gray-200 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all mb-3 bg-white">
      <div className="flex items-center gap-1 p-1.5 border-b border-gray-100 bg-gray-50 flex-wrap">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors ${editor.isActive('bold') ? 'bg-gray-200 font-bold text-blue-600' : ''}`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors ${editor.isActive('italic') ? 'bg-gray-200 font-bold text-blue-600' : ''}`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 font-bold text-blue-600' : ''}`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors ${editor.isActive('bulletList') ? 'bg-gray-200 font-bold text-blue-600' : ''}`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors ${editor.isActive('orderedList') ? 'bg-gray-200 font-bold text-blue-600' : ''}`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
      </div>
      <EditorContent editor={editor} className="cursor-text" />
      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: 'Description (optional)';
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.25rem 0;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.25rem 0;
        }
        .ProseMirror h2 {
          font-size: 1.1rem;
          font-weight: bold;
          margin-top: 0.5rem;
          margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  )
}
