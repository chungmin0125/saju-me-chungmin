import { renderRichText } from '../../utils/formatSajuResult'

export default function ResultBody({ blocks }) {
  return (
    <div className="result-body">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const HeadingTag = block.level === 1 ? 'h3' : 'h4'
          return (
            <HeadingTag
              key={index}
              className={`result-heading result-heading-${block.level}`}
            >
              {renderRichText(block.text)}
            </HeadingTag>
          )
        }

        if (block.type === 'list') {
          return (
            <ul key={index} className="result-list">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderRichText(item)}</li>
              ))}
            </ul>
          )
        }

        return (
          <p key={index} className="result-paragraph">
            {renderRichText(block.text)}
          </p>
        )
      })}
    </div>
  )
}
