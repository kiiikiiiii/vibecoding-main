import { useState, ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react';
import { MAX_TAGS, addTags } from '../utils/tags';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isFull = tags.length >= MAX_TAGS;

  // 입력값들을 태그로 추가하고, 하나라도 추가됐으면 true
  const commit = (raws: string[]) => {
    const result = addTags(raws, tags);
    if (result.tags !== tags) onChange(result.tags);
    setError(result.error);
    return result.tags !== tags;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const parts = e.target.value.split(',');
    const rest = parts.pop() ?? '';
    if (parts.length > 0) {
      // 쉼표 앞 텍스트는 태그로 추가, 실패한 항목은 버림
      commit(parts);
    } else {
      setError(null);
    }
    setInput(rest);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes(',')) return;
    e.preventDefault();
    commit((input + text).split(','));
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // 한글 조합 중 Enter는 무시 (조합 종료 후 Enter만 처리)
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (commit([input])) setInput('');
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
      setError(null);
    }
  };

  // Enter 없이 포커스가 빠지면 남은 텍스트를 추가 시도
  const handleBlur = () => {
    if (!input.trim()) return;
    if (commit([input])) setInput('');
  };

  const handleRemove = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
    setError(null);
  };

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag, index) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-muted text-foreground text-xs rounded-full px-2.5 py-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => handleRemove(index)}
              aria-label={`${tag} 태그 삭제`}
              className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={handleChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isFull}
          aria-label="태그 입력"
          placeholder={isFull ? `태그는 최대 ${MAX_TAGS}개` : '태그 입력 후 Enter'}
          className="flex-1 min-w-32 text-sm text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed"
        />
      </div>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
}
