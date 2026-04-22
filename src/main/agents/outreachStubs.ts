import type {
  CampaignAnalysis,
  CompanyResearch,
  CorrespondenceEntry,
  DeliveryReceipt,
  OutreachDraft
} from '../../shared/types'
import { requireOutput, type PipelineContext } from './registry'

export async function runOutreachStub(ctx: PipelineContext): Promise<OutreachDraft> {
  const research = requireOutput<CompanyResearch>(ctx, 'agent-1', 'company research')
  const analysis = requireOutput<CampaignAnalysis>(ctx, 'agent-2', 'campaign analysis')
  const to = research.socialLinks.find((l) => /mail|@/.test(l.url))?.url ?? 'office@example.at'
  return {
    to,
    subject: `Ein Werbevideo für ${research.companyName}`,
    body: [
      `Liebes Team von ${research.companyName},`,
      ``,
      `wir haben uns Ihre Arbeit angesehen und ein kurzes, auf Sie zugeschnittenes Werbevideo vorbereitet.`,
      `Kernidee: ${analysis.coreMessage}`,
      ``,
      `Wenn Sie das Ergebnis sehen möchten, melden Sie sich kurz zurück — wir schicken Ihnen den Vorschau-Link.`,
      ``,
      `Freundliche Grüße`
    ].join('\n'),
    sendMode: 'dry-run'
  }
}

export async function runCorrespondenceStub(_ctx: PipelineContext): Promise<CorrespondenceEntry[]> {
  return [
    {
      id: `corr_${Date.now()}`,
      direction: 'outbound',
      subject: 'Ein Werbevideo für Sie',
      body: '[stub — real correspondence agent needs IMAP/SMTP credentials and GDPR/TKG decision]',
      timestamp: Date.now()
    }
  ]
}

export async function runDeliveryStub(_ctx: PipelineContext): Promise<DeliveryReceipt> {
  return {
    sent: false,
    deliveredAt: null,
    downloadUrl: null
  }
}
