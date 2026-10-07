import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagInput } from './TagInput';

// TagInput은 controlled 컴포넌트라 상태를 가진 래퍼로 감싸서 테스트
function Harness({ initial = [] }: { initial?: string[] }) {
  const [tags, setTags] = useState(initial);
  return <TagInput tags={tags} onChange={setTags} />;
}

const getInput = () => screen.getByRole('textbox', { name: '태그 입력' });
const chipNames = () =>
  screen
    .queryAllByRole('button', { name: /태그 삭제$/ })
    .map((b) => b.parentElement?.firstChild?.textContent);

describe('TagInput', () => {
  it('Enter로 태그를 추가하고 입력창을 비운다', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(getInput(), '#react{Enter}');
    expect(chipNames()).toEqual(['react']);
    expect(getInput()).toHaveValue('');
  });

  it('× 버튼으로 태그를 삭제한다', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['react', 'vite']} />);
    await user.click(screen.getByRole('button', { name: 'react 태그 삭제' }));
    expect(chipNames()).toEqual(['vite']);
  });

  it('입력창이 비어 있을 때 Backspace로 마지막 태그를 삭제한다', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['react', 'vite']} />);
    await user.type(getInput(), '{Backspace}');
    expect(chipNames()).toEqual(['react']);
  });

  it('쉼표를 입력하면 쉼표 앞 텍스트를 태그로 추가한다', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(getInput(), 'a,b,c');
    expect(chipNames()).toEqual(['a', 'b']);
    expect(getInput()).toHaveValue('c');
  });

  it('쉼표가 포함된 텍스트를 붙여넣으면 모두 태그로 추가한다', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(getInput());
    await user.paste('a, b, c');
    expect(chipNames()).toEqual(['a', 'b', 'c']);
    expect(getInput()).toHaveValue('');
  });

  it('중복이면 에러를 보여주고, 입력이 바뀌면 지운다', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['React']} />);
    await user.type(getInput(), ' react {Enter}');
    expect(screen.getByText('이미 추가된 태그입니다')).toBeInTheDocument();
    expect(chipNames()).toEqual(['React']);

    await user.type(getInput(), 'x');
    expect(screen.queryByText('이미 추가된 태그입니다')).not.toBeInTheDocument();
  });

  it('한글 조합 중 Enter는 무시한다', () => {
    render(<Harness />);
    const input = getInput();
    fireEvent.change(input, { target: { value: '공부' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(chipNames()).toEqual([]);

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(chipNames()).toEqual(['공부']);
  });

  it('포커스가 빠지면 남은 텍스트를 태그로 추가한다', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(getInput(), 'react');
    await user.tab();
    expect(chipNames()).toEqual(['react']);
  });

  it('태그가 10개면 입력창을 비활성화한다', () => {
    render(<Harness initial={Array.from({ length: 10 }, (_, i) => `t${i}`)} />);
    expect(getInput()).toBeDisabled();
    expect(getInput()).toHaveAttribute('placeholder', '태그는 최대 10개');
  });
});
