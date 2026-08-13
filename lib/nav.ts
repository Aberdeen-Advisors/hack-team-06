/** Navigation for both shells. Edit here rather than in the layouts. */

export interface NavItem {
  href: string;
  label: string;
  /** One line describing what the area is for, used as the sidebar title attribute. */
  hint: string;
}

export const WORKSPACE_NAV: NavItem[] = [
  { href: '/workspace', label: 'Overview', hint: 'Engagement status, portfolio shape and what needs attention' },
  { href: '/workspace/fact-base', label: 'Fact Base', hint: 'Evidence and findings by capability area' },
  { href: '/workspace/maturity', label: 'Maturity', hint: 'Current and target maturity by focus area' },
  { href: '/workspace/opportunities', label: 'Opportunities', hint: 'The scored opportunity register' },
  { href: '/workspace/initiatives', label: 'Initiatives', hint: 'Initiatives, themes and rollups' },
  { href: '/workspace/roadmap', label: 'Roadmap', hint: 'Waves, dependencies and feasibility' },
  { href: '/workspace/ai-review', label: 'AI Review', hint: 'Proposed AI suggestions awaiting a decision' },
  { href: '/workspace/publish', label: 'Publish', hint: 'Choose what the client sees and publish a version' },
  { href: '/workspace/client-feedback', label: 'Client Feedback', hint: 'Review and apply what the client sent back' },
];

export const PORTAL_NAV: NavItem[] = [
  { href: '/portal', label: 'Overview', hint: 'What has been published and the headline picture' },
  { href: '/portal/roadmap', label: 'Roadmap', hint: 'The sequenced waves' },
  { href: '/portal/initiatives', label: 'Initiatives', hint: 'Initiatives and the opportunities inside them' },
  { href: '/portal/decisions', label: 'Decisions', hint: 'Decisions taken and the reasoning behind them' },
  { href: '/portal/feedback', label: 'My Feedback', hint: 'Everything you have raised and where it landed' },
];
