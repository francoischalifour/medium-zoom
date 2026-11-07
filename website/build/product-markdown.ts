import type { PhrasingContent, RootContent, TableRow } from 'mdast'

import { javascriptUsageCode } from '../src/gallery.ts'
import { installCommands, registryUrl } from '../src/install-commands.ts'
import {
  closingTitle,
  imageZoomApi,
  integrationsSection,
  productFeatures,
  productPages,
} from '../src/product-pages.ts'
import type { SitePage } from '../src/site-data.ts'
import { usageExamples } from '../src/usage-snippets.ts'
import { libraryGzipBytes } from './library-size.ts'
import { codeBlock, heading, inlineCopy, link, list, paragraph, text } from './markdown-nodes.ts'

// A product page's content as Markdown, from the copy and code samples the page renders.
// Interactive parts give way to what they show: every usage tab and the npm command.
export function productMarkdown(page: SitePage): RootContent[] {
  const { usage, closing } = productPages[page]
  const sections = pageSections[page]
  return [
    heading(2, [text('Install')]),
    { type: 'code', lang: 'sh', value: installCommands[page].npm },
    ...sections.installNote(),
    list(
      productFeatures(page, libraryGzipBytes()).map(feature => [
        { type: 'strong', children: [text(feature.title)] },
        text(` ${feature.description}`),
      ])
    ),
    heading(2, [text(usage.title)]),
    paragraph(inlineCopy(usage.description)),
    ...sections.usageCode(),
    paragraph([
      ...inlineCopy(usage.note),
      text(' '),
      link(usage.link.href, [text(usage.link.label)]),
    ]),
    ...sections.details(),
    heading(2, [text(closingTitle)]),
    paragraph([text(`${closing} `), link('/docs/', [text('Read the documentation')]), text('.')]),
  ]
}

type Section = () => RootContent[]

// The parts each page shows in its own way.
const pageSections: Record<
  SitePage,
  { installNote: Section; usageCode: Section; details: Section }
> = {
  javascript: {
    installNote: () => [],
    usageCode: () => [codeBlock({ code: javascriptUsageCode, title: 'app.js' })],
    details: integrationLinks,
  },
  react: {
    installNote: () => [
      paragraph([
        text('Read the component source in the '),
        link(registryUrl, [text('registry item')]),
        text('.'),
      ]),
    ],
    usageCode: () =>
      usageExamples.flatMap(example => [
        heading(3, [text(example.label)]),
        paragraph([text(example.description)]),
        codeBlock({ code: example.code, title: example.file }),
        paragraph([text(example.note)]),
      ]),
    details: apiTable,
  },
}

function apiTable(): RootContent[] {
  const row = (cells: PhrasingContent[][]): TableRow => ({
    type: 'tableRow',
    children: cells.map(children => ({ type: 'tableCell', children })),
  })
  return [
    heading(2, [text(imageZoomApi.title)]),
    paragraph(inlineCopy(imageZoomApi.description)),
    {
      type: 'table',
      children: [
        row([[text('Prop')], [text('What it does')], [text('Default')]]),
        ...imageZoomApi.props.map(prop =>
          row([
            [{ type: 'inlineCode', value: prop.name }],
            [text(prop.description)],
            inlineCopy(prop.default),
          ])
        ),
      ],
    },
  ]
}

function integrationLinks(): RootContent[] {
  const { title, description, featured, integrations } = integrationsSection
  return [
    heading(2, [text(title)]),
    paragraph([text(description)]),
    list([
      [
        link(featured.href, [text(featured.tag)]),
        text(`: ${featured.title} ${featured.description}`),
      ],
      ...integrations.map(integration => [
        link(integration.href, [text(integration.name)]),
        text(`: ${integration.description}`),
      ]),
    ]),
  ]
}
