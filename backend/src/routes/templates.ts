import { Router, Response } from "express";
import {
  AuthRequest,
  authMiddleware,
  cafeAuthMiddleware,
} from "../middleware/auth";
import { requireMailMarketingPlan } from "../utils/plans";
import { getPublicErrorMessage, logServerError } from "../utils/errors";
import { prisma } from "../config/prisma";

const router = Router();

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "sablon";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const plainTextToHtml = (value: string) =>
  value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p style="margin:0 0 16px;">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");

const getTemplateEmailTheme = (tone?: string | null) => {
  switch ((tone ?? "").toLowerCase()) {
    case "light":
      return {
        pageBg: "#f4eee8",
        cardBg: "#efe4d8",
        text: "#241c17",
        muted: "#4b3c33",
        overlay: "linear-gradient(90deg, rgba(248,238,226,.94), rgba(248,238,226,.34))",
      };
    case "pink":
    case "rose":
      return {
        pageBg: "#f7e6e4",
        cardBg: "#ead2cf",
        text: "#3b2022",
        muted: "#684449",
        overlay: "linear-gradient(90deg, rgba(248,226,224,.92), rgba(248,226,224,.34))",
      };
    case "green":
      return {
        pageBg: "#10231d",
        cardBg: "#142b23",
        text: "#fff8f1",
        muted: "#e9ddd3",
        overlay: "linear-gradient(90deg, rgba(8,21,17,.78), rgba(8,21,17,.26))",
      };
    default:
      return {
        pageBg: "#0d0d0d",
        cardBg: "#151515",
        text: "#fff8f1",
        muted: "#e9ddd3",
        overlay: "linear-gradient(90deg, rgba(0,0,0,.68), rgba(0,0,0,.24))",
      };
  }
};

const buildTemplateHtml = ({
  title,
  subject,
  description,
  imageUrl,
  textContent,
  ctaLabel,
  tone,
}: {
  title: string;
  subject: string;
  description: string;
  imageUrl: string;
  textContent: string;
  ctaLabel: string;
  tone?: string | null;
}) => {
  const theme = getTemplateEmailTheme(tone);
  const imageHtml = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="" width="640" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;border:0;opacity:.74;" />`
    : "";
  const titleText = description || title;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;background:${theme.pageBg};font-family:Arial,Helvetica,sans-serif;color:${theme.text};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${theme.pageBg};padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:${theme.cardBg};border:1px solid rgba(255,255,255,.10);border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:0;">
                <div style="position:relative;min-height:430px;background:${theme.cardBg};overflow:hidden;">
                  ${imageHtml}
                  <div style="position:absolute;inset:0;background:${theme.overlay};"></div>
                  <div style="position:relative;padding:48px 44px;max-width:430px;">
                    <div style="font-size:31px;line-height:1.1;color:${theme.text};font-weight:900;margin:0 0 24px;">${escapeHtml(titleText)}</div>
                    <div style="font-size:17px;line-height:1.72;color:${theme.muted};font-weight:700;margin:0 0 24px;">${plainTextToHtml(textContent)}</div>
                    <a href="{{actionUrl}}" style="display:inline-block;min-width:136px;text-align:center;padding:14px 22px;border-radius:6px;background:#c47a43;color:#fff8f1;text-decoration:none;font-size:15px;font-weight:900;">${escapeHtml(ctaLabel || "Kullan")}</a>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const DEFAULT_EMAIL_TEMPLATES = [
  {
    slug: "hos-geldin",
    title: "Hoş Geldiniz! ☕",
    subject: "Hoş geldiniz, sizi tekrar bekliyoruz",
    description: "Yeni üyelere sıcak bir karşılama mesajı gönderin.",
    category: "Hoş Geldin",
    tone: "dark",
    imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
    ctaLabel: "Keşfetmeye Başla",
    textContent: "Merhaba,\n\nAramıza katıldığınız için çok mutluyuz. Size özel sürprizler ve fırsatlar için bizi takipte kalın.\n\nBir sonraki kahve molanızda görüşmek üzere.",
  },
  {
    slug: "ozel-indirim",
    title: "Sana Özel %15 İndirim!",
    subject: "Bugün size özel %15 indirim var",
    description: "Özel indirim kampanyalarınızı duyurun.",
    category: "Kampanya",
    tone: "light",
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80",
    ctaLabel: "Hemen Kullan",
    textContent: "Merhaba,\n\nSizi özledik. Tüm içeceklerde geçerli %15 indirim kodunuz hazır.\n\nKODUN: LUMINA15\n\nBu fırsat kısa süreli geçerlidir.",
  },
  {
    slug: "yeni-lezzetler",
    title: "Yeni Lezzetler Seni Bekliyor! ✨",
    subject: "Menümüze yeni lezzetler eklendi",
    description: "Yeni ürünlerinizi müşterilerinize duyurun.",
    category: "Duyuru",
    tone: "warm",
    imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80",
    ctaLabel: "Menüyü İncele",
    textContent: "Merhaba,\n\nMenümüze eklediğimiz yeni lezzetleri keşfetmeye ne dersiniz? Taze tatlar ve sıcak kahveler sizi bekliyor.\n\nUğrayın, birlikte keşfedelim.",
  },
  {
    slug: "dogum-gunu",
    title: "Doğum Günün Kutlu Olsun! 🎉",
    subject: "Doğum gününüz için küçük bir sürprizimiz var",
    description: "Doğum günü olan müşterilerinize özel mesaj gönderin.",
    category: "Özel Gün",
    tone: "rose",
    imageUrl: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=80",
    ctaLabel: "Sürprizi Al",
    textContent: "Merhaba,\n\nÖzel gününüzde size küçük bir sürprizimiz var. Bu içecek bizden olsun.\n\nYeni yaşınız mutluluk, keyif ve güzel anlarla dolsun.",
  },
  {
    slug: "hafta-sonu-kahve",
    title: "Hafta Sonu Kahve Keyfi! ☕",
    subject: "Hafta sonu kahve keyfi sizi bekliyor",
    description: "Hafta sonu kampanyalarınızı paylaşın.",
    category: "Kampanya",
    tone: "dark",
    imageUrl: "https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&w=900&q=80",
    ctaLabel: "Fırsatı Kullan",
    textContent: "Merhaba,\n\nHafta sonuna özel tüm kahvelerde %10 indirim sizi bekliyor.\n\nKeyifli bir mola için sizi bekliyoruz.",
  },
  {
    slug: "ramazan",
    title: "Ramazan Mübarek Olsun! 🌙",
    subject: "Ramazan ayına özel davetimiz var",
    description: "Ramazan ayına özel mesaj şablonu.",
    category: "Özel Gün",
    tone: "green",
    imageUrl: "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=900&q=80",
    ctaLabel: "Hayırlı Ramazanlar",
    textContent: "Merhaba,\n\nBu mübarek ayda sevdiklerinizle birlikte sağlıklı ve huzurlu bir Ramazan dileriz.\n\nİftar sonrası kahve keyfi için sizi bekleriz.",
  },
  {
    slug: "sadakat-programi",
    title: "Sadakat Programı Seni Bekliyor! ⭐",
    subject: "Her ziyaretinizde puan kazanın",
    description: "Sadakat programınızı tanıtın.",
    category: "Sadakat",
    tone: "dark",
    imageUrl: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=80",
    ctaLabel: "Detayları İncele",
    textContent: "Merhaba,\n\nHer harcamada puan kazan, özel ödüllerin keyfini çıkar.\n\nSadakat programımıza katılarak sürpriz avantajlardan yararlanabilirsiniz.",
  },
  {
    slug: "anket-daveti",
    title: "Anketimize Katılır mısın? 📝",
    subject: "Fikriniz bizim için çok değerli",
    description: "Müşteri geri bildirimleri alın.",
    category: "Diğer",
    tone: "light",
    imageUrl: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=900&q=80",
    ctaLabel: "Ankete Katıl",
    textContent: "Merhaba,\n\nGörüşleriniz bizim için çok değerli. 2 dakikanızı ayırarak deneyiminizi bizimle paylaşır mısınız?\n\nGeri bildiriminiz hizmetimizi geliştirmemize yardımcı olur.",
  },
  {
    slug: "etkinlik-daveti",
    title: "Etkinliğimize Davetlisin! ♫",
    subject: "Bu hafta etkinliğimize davetlisiniz",
    description: "Etkinliklerinize davet gönderin.",
    category: "Etkinlik",
    tone: "stage",
    imageUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
    ctaLabel: "Hemen Katıl",
    textContent: "Merhaba,\n\nCanlı müzik ve lezzetli ikramlarla dolu bir akşam sizi bekliyor.\n\nTarih: 24 Mayıs 2026\nSaat: 20:00 - 23:00\nYer: Lumina Cafe",
  },
  {
    slug: "anneler-gunu",
    title: "Anneler Gününüz Kutlu Olsun! 🌷",
    subject: "Anneler gününe özel küçük bir hediye",
    description: "Anneler günü için özel şablon.",
    category: "Özel Gün",
    tone: "pink",
    imageUrl: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=900&q=80",
    ctaLabel: "Fırsatı Kaçırma",
    textContent: "Merhaba,\n\nTüm annelerimizin gününü kutlu olsun. Bugüne özel tatlılarda %20 indirim sizleri bekliyor.\n\nSevdiklerinizle güzel bir gün geçirmeniz dileğiyle.",
  },
];

const validateTemplatePayload = (body: any, partial = false) => {
  const errors: string[] = [];
  const title = normalizeString(body.title);
  const subject = normalizeString(body.subject);
  const textContent = normalizeString(body.textContent);
  const imageUrl = normalizeString(body.imageUrl);

  if (!partial || title) {
    if (!title) errors.push("Title is required");
    if (title.length > 120) errors.push("Title must be 120 characters or less");
  }

  if (!partial || subject) {
    if (!subject) errors.push("Subject is required");
    if (subject.length > 200) errors.push("Subject must be 200 characters or less");
  }

  if (!partial || textContent) {
    if (!textContent) errors.push("Text content is required");
    if (textContent.length > 6000) errors.push("Text content must be 6000 characters or less");
  }

  if (imageUrl) {
    try {
      const parsed = new URL(imageUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        errors.push("Image URL must use http or https");
      }
    } catch {
      errors.push("Image URL is invalid");
    }
  }

  return errors;
};

const buildTemplateData = (body: any) => {
  const title = normalizeString(body.title);
  const subject = normalizeString(body.subject);
  const description = normalizeString(body.description);
  const category = normalizeString(body.category) || "Kampanya";
  const tone = normalizeString(body.tone) || "dark";
  const imageUrl = normalizeString(body.imageUrl);
  const ctaLabel = normalizeString(body.ctaLabel) || "Kullan";
  const textContent = normalizeString(body.textContent);
  const htmlContent =
    normalizeString(body.htmlContent) ||
    buildTemplateHtml({ title, subject, description, imageUrl, textContent, ctaLabel, tone });

  return {
    title,
    subject,
    description: description || null,
    type: "email",
    category,
    tone,
    imageUrl: imageUrl || null,
    ctaLabel,
    htmlContent,
    textContent,
  };
};

const toTemplateResponse = (template: any) => ({
  id: template.id,
  slug: template.slug,
  title: template.title,
  subject: template.subject,
  description: template.description,
  type: template.type,
  category: template.category,
  tone: template.tone,
  imageUrl: template.imageUrl,
  ctaLabel: template.ctaLabel,
  htmlContent: template.htmlContent,
  textContent: template.textContent,
  isSystem: template.isSystem,
  status: template.status,
  usageCount: template.usageCount,
  lastUsedAt: template.lastUsedAt?.toISOString?.() ?? template.lastUsedAt ?? null,
  createdAt: template.createdAt?.toISOString?.() ?? template.createdAt ?? null,
  updatedAt: template.updatedAt?.toISOString?.() ?? template.updatedAt ?? null,
});

const seedDefaultEmailTemplates = async (cafeId: string, userId?: string) => {
  const existingCount = await prisma.emailTemplate.count({
    where: { cafeId, type: "email" },
  });

  if (existingCount > 0) {
    return;
  }

  await prisma.emailTemplate.createMany({
    data: DEFAULT_EMAIL_TEMPLATES.map((template, index) => ({
      cafeId,
      createdBy: userId,
      slug: template.slug,
      title: template.title,
      subject: template.subject,
      description: template.description,
      type: "email",
      category: template.category,
      tone: template.tone,
      imageUrl: template.imageUrl,
      ctaLabel: template.ctaLabel,
      htmlContent: buildTemplateHtml(template),
      textContent: template.textContent,
      isSystem: true,
      status: "active",
      sortOrder: index,
      metadata: {
        seed: "sharevibe-default-email-templates-v1",
      },
    })),
    skipDuplicates: true,
  });
};

router.get(
  "/cafes/:cafeId/templates",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      if (!(await requireMailMarketingPlan(prisma, cafeId, res))) {
        return;
      }
      await seedDefaultEmailTemplates(cafeId, req.userId);

      const status = normalizeString(req.query.status) || "active";
      const category = normalizeString(req.query.category);
      const search = normalizeString(req.query.search);
      const sort = normalizeString(req.query.sort) || "newest";
      const limit = Math.min(parsePositiveInt(req.query.limit, 10), 50);
      const page = parsePositiveInt(req.query.page, 1);
      const skip = (page - 1) * limit;
      const where: any = {
        cafeId,
        type: "email",
        ...(status !== "all" ? { status } : {}),
        ...(category && category !== "Tümü" ? { category } : {}),
      };

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { subject: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { textContent: { contains: search, mode: "insensitive" } },
        ];
      }

      const orderBy =
        sort === "popular"
          ? [{ usageCount: "desc" as const }, { updatedAt: "desc" as const }]
          : sort === "title"
            ? [{ title: "asc" as const }]
            : [{ sortOrder: "asc" as const }, { createdAt: "desc" as const }];

      const [templates, total, categories] = await Promise.all([
        prisma.emailTemplate.findMany({ where, orderBy, skip, take: limit }),
        prisma.emailTemplate.count({ where }),
        prisma.emailTemplate.groupBy({
          by: ["category"],
          where: { cafeId, type: "email", status: "active" },
          _count: { category: true },
          orderBy: { category: "asc" },
        }),
      ]);

      return res.json({
        templates: templates.map(toTemplateResponse),
        total,
        page,
        limit,
        pageCount: Math.max(1, Math.ceil(total / limit)),
        categories: categories.map((item) => ({
          name: item.category,
          count: item._count.category,
        })),
      });
    } catch (error: any) {
      logServerError("Error listing templates:", error);
      return res.status(500).json({ error: getPublicErrorMessage("Failed to list templates", error) });
    }
  }
);

router.post(
  "/cafes/:cafeId/templates",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      if (!(await requireMailMarketingPlan(prisma, cafeId, res))) {
        return;
      }
      const errors = validateTemplatePayload(req.body);

      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join("; ") });
      }

      const data = buildTemplateData(req.body);
      const baseSlug = normalizeSlug(normalizeString(req.body.slug) || data.title);
      let slug = baseSlug;
      let suffix = 1;

      while (await prisma.emailTemplate.findUnique({ where: { cafeId_slug: { cafeId, slug } } })) {
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
      }

      const template = await prisma.emailTemplate.create({
        data: {
          ...data,
          slug,
          cafeId,
          createdBy: req.userId,
          isSystem: false,
          status: "active",
        },
      });

      return res.status(201).json(toTemplateResponse(template));
    } catch (error: any) {
      logServerError("Error creating template:", error);
      return res.status(500).json({ error: getPublicErrorMessage("Failed to create template", error) });
    }
  }
);

router.patch(
  "/cafes/:cafeId/templates/:templateId",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const templateId = req.params.templateId;
      if (!(await requireMailMarketingPlan(prisma, cafeId, res))) {
        return;
      }
      const existing = await prisma.emailTemplate.findFirst({
        where: { id: templateId, cafeId },
      });

      if (!existing) {
        return res.status(404).json({ error: "Template not found" });
      }

      const errors = validateTemplatePayload(req.body, true);
      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join("; ") });
      }

      const merged = {
        title: normalizeString(req.body.title) || existing.title,
        subject: normalizeString(req.body.subject) || existing.subject,
        description:
          req.body.description === null
            ? ""
            : normalizeString(req.body.description) || existing.description || "",
        category: normalizeString(req.body.category) || existing.category,
        tone: normalizeString(req.body.tone) || existing.tone,
        imageUrl:
          req.body.imageUrl === null
            ? ""
            : normalizeString(req.body.imageUrl) || existing.imageUrl || "",
        ctaLabel: normalizeString(req.body.ctaLabel) || existing.ctaLabel || "Kullan",
        textContent: normalizeString(req.body.textContent) || existing.textContent,
      };

      const htmlContent =
        normalizeString(req.body.htmlContent) ||
        buildTemplateHtml({
          title: merged.title,
          subject: merged.subject,
          description: merged.description,
          imageUrl: merged.imageUrl,
          textContent: merged.textContent,
          ctaLabel: merged.ctaLabel,
          tone: merged.tone,
        });

      const updated = await prisma.emailTemplate.update({
        where: { id: templateId },
        data: {
          title: merged.title,
          subject: merged.subject,
          description: merged.description || null,
          category: merged.category,
          tone: merged.tone,
          imageUrl: merged.imageUrl || null,
          ctaLabel: merged.ctaLabel,
          textContent: merged.textContent,
          htmlContent,
          status: normalizeString(req.body.status) || existing.status,
        },
      });

      return res.json(toTemplateResponse(updated));
    } catch (error: any) {
      logServerError("Error updating template:", error);
      return res.status(500).json({ error: getPublicErrorMessage("Failed to update template", error) });
    }
  }
);

router.post(
  "/cafes/:cafeId/templates/:templateId/use",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const templateId = req.params.templateId;
      if (!(await requireMailMarketingPlan(prisma, cafeId, res))) {
        return;
      }
      const template = await prisma.emailTemplate.findFirst({
        where: { id: templateId, cafeId, type: "email" },
      });

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const updated = await prisma.emailTemplate.update({
        where: { id: templateId },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      return res.json(toTemplateResponse(updated));
    } catch (error: any) {
      logServerError("Error using template:", error);
      return res.status(500).json({ error: getPublicErrorMessage("Failed to use template", error) });
    }
  }
);

router.delete(
  "/cafes/:cafeId/templates/:templateId",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const templateId = req.params.templateId;
      if (!(await requireMailMarketingPlan(prisma, cafeId, res))) {
        return;
      }
      const template = await prisma.emailTemplate.findFirst({
        where: { id: templateId, cafeId },
      });

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const archived = await prisma.emailTemplate.update({
        where: { id: templateId },
        data: { status: "archived" },
      });

      return res.json(toTemplateResponse(archived));
    } catch (error: any) {
      logServerError("Error archiving template:", error);
      return res.status(500).json({ error: getPublicErrorMessage("Failed to archive template", error) });
    }
  }
);

export default router;
