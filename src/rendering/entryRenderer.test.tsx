import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderEntry, renderEntries, renderInline } from './entryRenderer';

describe('renderInline', () => {
  it('renders plain text', () => {
    const { container } = render(<>{renderInline('Hello world')}</>);
    expect(container).toHaveTextContent('Hello world');
  });

  it('renders {@damage} as styled dice text', () => {
    const { container } = render(<>{renderInline('takes {@damage 8d6} damage')}</>);
    expect(container).toHaveTextContent('takes 8d6 damage');
  });

  it('renders {@b} as <strong>', () => {
    const { container } = render(<>{renderInline('{@b bold text}')}</>);
    expect(container.querySelector('strong')).toBeTruthy();
    expect(container).toHaveTextContent('bold text');
  });

  it('renders {@i} as <em>', () => {
    const { container } = render(<>{renderInline('{@i italic}')}</>);
    expect(container.querySelector('em')).toBeTruthy();
  });

  it('renders {@h} as bold "Hit:"', () => {
    const { container } = render(<>{renderInline('{@h}')}</>);
    expect(container.querySelector('strong')).toBeTruthy();
    expect(container).toHaveTextContent('Hit:');
  });

  it('renders {@atk mw} as italic attack label', () => {
    const { container } = render(<>{renderInline('{@atk mw}')}</>);
    expect(container.querySelector('em')).toBeTruthy();
    expect(container).toHaveTextContent('Melee Weapon Attack:');
  });

  it('renders {@dc 15} as plain text "DC 15"', () => {
    const { container } = render(<>{renderInline('{@dc 15}')}</>);
    expect(container).toHaveTextContent('DC 15');
  });

  it('renders {@hit 4} as "+4"', () => {
    const { container } = render(<>{renderInline('{@hit 4}')}</>);
    expect(container).toHaveTextContent('+4');
  });

  it('renders {@hit -1} as "-1"', () => {
    const { container } = render(<>{renderInline('{@hit -1}')}</>);
    expect(container).toHaveTextContent('-1');
  });

  it('renders nested tags', () => {
    const { container } = render(<>{renderInline('{@b some {@i nested} text}')}</>);
    expect(container.querySelector('strong')).toBeTruthy();
    expect(container.querySelector('em')).toBeTruthy();
    expect(container).toHaveTextContent('some nested text');
  });

  it('renders unknown tags as display text without throwing', () => {
    expect(() => render(<>{renderInline('{@unknowntag display text}')}</>)).not.toThrow();
    const { container } = render(<>{renderInline('{@unknowntag display text}')}</>);
    expect(container).toHaveTextContent('display text');
  });

  it('returns null for empty string', () => {
    const { container } = render(<>{renderInline('')}</>);
    expect(container.textContent).toBe('');
  });
});

describe('renderEntry', () => {
  it('wraps a string entry in a <p>', () => {
    const { container } = render(<>{renderEntry('A description.', 'k0')}</>);
    expect(container.querySelector('p')).toBeTruthy();
    expect(container).toHaveTextContent('A description.');
  });

  it('renders an entries node with its heading', () => {
    const { container } = render(
      <>
        {renderEntry(
          { type: 'entries', name: 'At Higher Levels', entries: ['Extra damage.'] },
          'k0',
        )}
      </>,
    );
    expect(container).toHaveTextContent('At Higher Levels');
    expect(container).toHaveTextContent('Extra damage.');
  });

  it('renders a list node as <ul> with <li> items', () => {
    const { container } = render(
      <>{renderEntry({ type: 'list', items: ['Item one', 'Item two'] }, 'k0')}</>,
    );
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container).toHaveTextContent('Item one');
    expect(container).toHaveTextContent('Item two');
  });

  it('renders a labelled item node with both its name and entry value', () => {
    const { container } = render(
      <>{renderEntry({ type: 'item', name: 'Skill Proficiencies:', entry: '{@skill Stealth}, {@skill Sleight of Hand}' }, 'k0')}</>,
    );
    expect(container).toHaveTextContent('Skill Proficiencies:');
    expect(container).toHaveTextContent('Stealth');
    expect(container).toHaveTextContent('Sleight of Hand');
  });

  it('renders a hanging list of labelled items (background proficiencies/equipment)', () => {
    const { container } = render(
      <>{renderEntry({
        type: 'list',
        items: [
          { type: 'item', name: 'Tool Proficiencies:', entry: "{@item Disguise kit|phb}" },
          { type: 'item', name: 'Equipment:', entry: 'A small knife and 10 gp' },
        ],
      }, 'k0')}</>,
    );
    expect(container).toHaveTextContent('Tool Proficiencies:');
    expect(container).toHaveTextContent('Disguise kit');
    expect(container).toHaveTextContent('Equipment:');
    expect(container).toHaveTextContent('A small knife and 10 gp');
  });

  it('renders a table node with headers and rows', () => {
    const { container } = render(
      <>
        {renderEntry(
          {
            type: 'table',
            colLabels: ['Level', 'Damage'],
            rows: [['1st', '1d6'], ['5th', '2d6']],
          },
          'k0',
        )}
      </>,
    );
    expect(container.querySelector('table')).toBeTruthy();
    expect(container.querySelectorAll('th')).toHaveLength(2);
    expect(container.querySelectorAll('tr')).toHaveLength(3); // header + 2 data rows
  });

  it('renders unknown node types without throwing', () => {
    expect(() =>
      render(<>{renderEntry({ type: 'unknownFutureType' }, 'k0')}</>),
    ).not.toThrow();
  });
});

describe('renderEntries', () => {
  it('renders multiple entries in order', () => {
    const { container } = render(
      <>{renderEntries(['First paragraph.', 'Second paragraph.'])}</>,
    );
    const paras = container.querySelectorAll('p');
    expect(paras).toHaveLength(2);
    expect(paras[0]).toHaveTextContent('First paragraph.');
    expect(paras[1]).toHaveTextContent('Second paragraph.');
  });
});
