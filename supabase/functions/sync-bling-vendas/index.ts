import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface BlingOrder {
  id: number;
  numero: number;
  data: string;
  total: number;
  totalProdutos: number;
  contato: { id: number; nome: string };
  situacao: { id: number; valor: number };
  loja?: { id: number };
  vendedor?: { id: number };
}

interface ContactMatch {
  id: string;
  full_name: string;
  phone: string | null;
  origin: string | null;
  origin_campaign: string | null;
  created_at: string;
  method: "exact" | "partial" | "phone";
}

interface FingerprintPattern {
  pattern: string;
  origin: string;
  is_from_me: boolean;
  maxLength?: number;
}

const BLING_BASE = "https://www.bling.com.br/Api/v3";
const SITUACAO_CANCELADO = 12;

const FINGERPRINTS: FingerprintPattern[] = [
  { pattern: "tenho interesse e queria mais informa", origin: "Meta CTWA", is_from_me: false },
  { pattern: "recebi o seu contato aqui", origin: "Meta Redirect", is_from_me: true },
  { pattern: "vim pelo linktree", origin: "Linktree", is_from_me: false },
  { pattern: "vim pelo site", origin: "Google/Site", is_from_me: false },
  { pattern: "vim pelo stories", origin: "Instagram Stories", is_from_me: false },
  { pattern: "vim pelo instagram", origin: "Instagram Organico", is_from_me: false },
  { pattern: "vi no instagram", origin: "Instagram Organico", is_from_me: false },
  { pattern: "vi pelo instagram", origin: "Instagram Organico", is_from_me: false },
  { pattern: "pelo instagram", origin: "Instagram Organico", is_from_me: false, maxLength: 50 },
  { pattern: "vim pelo google", origin: "Google/Site", is_from_me: false },
  { pattern: "pelo google", origin: "Google/Site", is_from_me: false, maxLength: 50 },
  { pattern: "vim pelo facebook", origin: "Facebook Organico", is_from_me: false },
  { pattern: "vi no facebook", origin: "Facebook Organico", is_from_me: false },
  { pattern: "pelo site", origin: "Google/Site", is_from_me: false, maxLength: 50 },
  { pattern: "vim pelo emprega mais", origin: "Emprega Mais", is_from_me: false },
  { pattern: "indica\u00e7\u00e3o", origin: "Indicacao", is_from_me: false },
  { pattern: "indicacao", origin: "Indicacao", is_from_me: false },
  { pattern: "recebi a indica\u00e7\u00e3o", origin: "Indicacao", is_from_me: false },
  { pattern: "recebi indica\u00e7\u00e3o", origin: "Indicacao", is_from_me: false },
  { pattern: "vi no an\u00fancio", origin: "Meta Ads (via anuncio)", is_from_me: false },
  { pattern: "vi no anuncio", origin: "Meta Ads (via anuncio)", is_from_me: false },
  { pattern: "vi a propaganda", origin: "Meta Ads (via anuncio)", is_from_me: false },
];

const CONTACT_ORIGIN_MAP: Record<string, string> = {
  meta_ads: "Meta Direto",
  ctwa_ad: "Meta CTWA",
  linktree: "Linktree",
  manual: "Cadastro Manual",
  whatsapp: "Organico (WhatsApp)",
  redirect: "Meta Redirect",
  site: "Google/Site",
  n8n: "Automacao (n8n)",
};

function mapReferralToOrigin(referralSource: string, referralData: Record<string, any> | null): { origin: string; campanha: string | null } {
  const data = referralData ?? {};
  switch (referralSource) {
    case "ctwa_ad": return { origin: "Meta CTWA", campanha: data.headline ?? null };
    case "meta_ads": {
      if (data.sourceType === "ad") return { origin: "Meta CTWA", campanha: data.adName ?? data.headline ?? null };
      if (data.detected_by?.startsWith("message_pattern")) return { origin: "Meta CTWA", campanha: null };
      return { origin: "Meta CTWA", campanha: null };
    }
    case "redirect": {
      const utmMedium = data.utm_medium ?? null;
      const isTemplate = utmMedium?.startsWith("{{") ?? false;
      return { origin: "Meta Redirect", campanha: isTemplate ? null : utmMedium };
    }
    case "linktree": return { origin: "Linktree", campanha: data.campaign_name ?? null };
    case "site": return { origin: "Google/Site", campanha: data.campaign_name ?? null };
    default: return { origin: `Outro (${referralSource})`, campanha: null };
  }
}

function mapContactOriginToOrigin(contactOrigin: string | null): { origin: string; campanha: string | null } {
  if (!contactOrigin) return { origin: "Organico (sem origem)", campanha: null };
  const mapped = CONTACT_ORIGIN_MAP[contactOrigin];
  return { origin: mapped ?? "Organico (sem origem)", campanha: null };
}

async function getBlingTokens(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("token_bling").select("token, refresh_token, basic_auth").eq("id", 1).single();
  if (error || !data) throw new Error("Token Bling nao encontrado no banco");
  return data;
}

async function refreshBlingToken(supabase: SupabaseClient, refreshToken: string, basicAuth: string): Promise<string> {
  const res = await fetch("https://www.bling.com.br/Api/v3/oauth/token", { method: "POST", headers: { "Authorization": basicAuth, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }) });
  if (!res.ok) { const text = await res.text(); throw new Error(`Refresh token falhou (${res.status}): ${text}`); }
  const tokens = await res.json();
  await supabase.from("token_bling").update({ token: tokens.access_token, refresh_token: tokens.refresh_token, updated_at: new Date().toISOString() }).eq("id", 1);
  return tokens.access_token;
}

let _currentToken = "";
async function blingFetch(supabase: SupabaseClient, url: string, token: string, basicAuth: string, refreshTk: string): Promise<{ data: any; token: string }> {
  let res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
  if (res.status === 401) { token = await refreshBlingToken(supabase, refreshTk, basicAuth); _currentToken = token; res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } }); }
  if (!res.ok) { const text = await res.text(); throw new Error(`Bling API (${res.status}): ${text.slice(0, 200)}`); }
  return { data: await res.json(), token };
}

async function fetchBlingOrders(supabase: SupabaseClient, token: string, basicAuth: string, refreshTk: string, dataInicial: string, dataFinal: string) {
  const allOrders: BlingOrder[] = []; let page = 1; let currentToken = token;
  while (true) {
    const url = `${BLING_BASE}/pedidos/vendas?pagina=${page}&limite=100&dataInicial=${dataInicial}&dataFinal=${dataFinal}`;
    const result = await blingFetch(supabase, url, currentToken, basicAuth, refreshTk); currentToken = result.token;
    if (!result.data?.data || result.data.data.length === 0) break; allOrders.push(...result.data.data);
    if (result.data.data.length < 100) break; page++; await new Promise(r => setTimeout(r, 300));
  }
  return { orders: allOrders, token: currentToken };
}

async function fetchVendedoresMap(supabase: SupabaseClient, token: string, basicAuth: string, refreshTk: string) {
  const map = new Map<number, string>(); let page = 1; let currentToken = token;
  while (true) {
    try {
      const result = await blingFetch(supabase, `${BLING_BASE}/vendedores?pagina=${page}&limite=100`, currentToken, basicAuth, refreshTk); currentToken = result.token;
      if (!result.data?.data || result.data.data.length === 0) break;
      for (const v of result.data.data) { map.set(v.id, v.contato?.nome || v.nome || v.descricao || `Vendedor ${v.id}`); }
      if (result.data.data.length < 100) break; page++;
    } catch { break; }
  }
  return { map, token: currentToken };
}

async function prefetchContacts(supabase: SupabaseClient, names: string[]): Promise<Map<string, ContactMatch>> {
  const map = new Map<string, ContactMatch>(); if (names.length === 0) return map;
  const batchSize = 20;
  for (let i = 0; i < names.length; i += batchSize) {
    const batch = names.slice(i, i + batchSize);
    for (const name of batch) {
      const nameLower = name.trim(); if (!nameLower) continue; if (map.has(nameLower.toLowerCase())) continue;
      const { data: exact } = await supabase.from("contacts").select("id, full_name, phone, origin, origin_campaign, created_at").ilike("full_name", nameLower).limit(1);
      if (exact && exact.length > 0) { map.set(nameLower.toLowerCase(), { ...exact[0], method: "exact" }); continue; }
      const parts = nameLower.split(/[\/\-]/).map(p => p.trim()).filter(p => p.length > 3);
      for (const part of parts) {
        const { data: partial } = await supabase.from("contacts").select("id, full_name, phone, origin, origin_campaign, created_at").ilike("full_name", `%${part}%`).limit(1);
        if (partial && partial.length > 0) { map.set(nameLower.toLowerCase(), { ...partial[0], method: "partial" }); break; }
      }
    }
  }
  return map;
}

async function prefetchOrigins(supabase: SupabaseClient, contactIds: string[]): Promise<Map<string, { origin: string; campanha: string | null; vendedor_crm: string | null }>> {
  const map = new Map<string, { origin: string; campanha: string | null; vendedor_crm: string | null }>(); if (contactIds.length === 0) return map;
  const batchSize = 50;
  const allConvs: { id: string; contact_id: string; referral_source: string | null; referral_data: any; created_at: string; assigned_to: string | null }[] = [];
  for (let i = 0; i < contactIds.length; i += batchSize) { const batch = contactIds.slice(i, i + batchSize); const { data } = await supabase.from("conversations").select("id, contact_id, referral_source, referral_data, created_at, assigned_to").in("contact_id", batch); if (data) allConvs.push(...data); }
  const allAssignedIds = [...new Set(allConvs.map(c => c.assigned_to).filter((id): id is string => id != null))];
  const profileMap = new Map<string, string>();
  for (let i = 0; i < allAssignedIds.length; i += batchSize) { const batch = allAssignedIds.slice(i, i + batchSize); const { data } = await supabase.from("profiles").select("id, full_name").in("id", batch); if (data) { for (const p of data) { profileMap.set(p.id, p.full_name); } } }
  const convByContact = new Map<string, typeof allConvs>(); for (const conv of allConvs) { const list = convByContact.get(conv.contact_id) || []; list.push(conv); convByContact.set(conv.contact_id, list); }
  function resolveVendedorCrm(convs: typeof allConvs): string | null { const sorted = convs.filter(c => c.assigned_to != null).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); return sorted.length > 0 ? (profileMap.get(sorted[0].assigned_to!) ?? null) : null; }
  const tier2Contacts: string[] = []; const tier3Contacts: string[] = [];
  for (const contactId of contactIds) {
    const convs = convByContact.get(contactId) || []; if (convs.length === 0) { tier3Contacts.push(contactId); continue; }
    const vendedorCrm = resolveVendedorCrm(convs);
    const convsWithReferral = convs.filter(c => c.referral_source != null).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (convsWithReferral.length > 0) { const best = convsWithReferral[0]; const result = mapReferralToOrigin(best.referral_source!, best.referral_data); map.set(contactId, { ...result, vendedor_crm: vendedorCrm }); continue; }
    tier2Contacts.push(contactId);
  }
  if (tier2Contacts.length > 0) {
    const tier2ConvIds: string[] = []; for (const contactId of tier2Contacts) { const convs = convByContact.get(contactId) || []; for (const conv of convs) { tier2ConvIds.push(conv.id); } }
    const allMsgs: { conversation_id: string; content: string; is_from_me: boolean }[] = [];
    for (let i = 0; i < tier2ConvIds.length; i += batchSize) { const batch = tier2ConvIds.slice(i, i + batchSize); const { data } = await supabase.from("messages").select("conversation_id, content, is_from_me, created_at").in("conversation_id", batch).order("created_at", { ascending: true }).limit(5000); if (data) allMsgs.push(...data); }
    const msgsByConv = new Map<string, typeof allMsgs>(); for (const msg of allMsgs) { const list = msgsByConv.get(msg.conversation_id) || []; list.push(msg); msgsByConv.set(msg.conversation_id, list); }
    for (const contactId of tier2Contacts) {
      const convs = convByContact.get(contactId) || []; const vendedorCrm = resolveVendedorCrm(convs); let fpFound = false;
      for (const conv of convs) { const msgs = msgsByConv.get(conv.id) || []; for (const msg of msgs) { if (!msg.content) continue; const isRecebiContato = msg.is_from_me && msg.content.toLowerCase().includes("recebi o seu contato"); if (msg.is_from_me && !isRecebiContato) continue; const contentLower = msg.content.toLowerCase(); for (const fp of FINGERPRINTS) { if (msg.is_from_me !== fp.is_from_me) continue; if (fp.maxLength != null && msg.content.length >= fp.maxLength) continue; if (contentLower.includes(fp.pattern)) { map.set(contactId, { origin: fp.origin, campanha: null, vendedor_crm: vendedorCrm }); fpFound = true; break; } } if (fpFound) break; } if (fpFound) break; }
      if (!fpFound) { tier3Contacts.push(contactId); }
    }
  }
  if (tier3Contacts.length > 0) {
    for (let i = 0; i < tier3Contacts.length; i += batchSize) { const batch = tier3Contacts.slice(i, i + batchSize); const { data: contactsData } = await supabase.from("contacts").select("id, origin").in("id", batch); if (contactsData) { for (const contact of contactsData) { const result = mapContactOriginToOrigin(contact.origin); const convs = convByContact.get(contact.id) || []; const vendedorCrm = resolveVendedorCrm(convs); map.set(contact.id, { ...result, vendedor_crm: vendedorCrm }); } } }
    for (const contactId of tier3Contacts) { if (!map.has(contactId)) { map.set(contactId, { origin: "Organico (sem origem)", campanha: null, vendedor_crm: null }); } }
  }
  return map;
}

async function prefetchDisparos(supabase: SupabaseClient, contactIds: string[]): Promise<Map<string, { sent_at: string }>> {
  const map = new Map<string, { sent_at: string }>(); if (contactIds.length === 0) return map;
  const batchSize = 50;
  for (let i = 0; i < contactIds.length; i += batchSize) { const batch = contactIds.slice(i, i + batchSize); const { data } = await supabase.from("bulk_dispatch_contacts").select("contact_id, sent_at").in("contact_id", batch).eq("status", "sent").order("sent_at", { ascending: false }); if (data) { for (const d of data) { if (!map.has(d.contact_id)) { map.set(d.contact_id, { sent_at: d.sent_at }); } } } }
  return map;
}

async function matchByPhone(supabase: SupabaseClient, blingToken: string, basicAuth: string, refreshTk: string, blingContactId: number): Promise<{ match: ContactMatch | null; token: string }> {
  try {
    const result = await blingFetch(supabase, `${BLING_BASE}/contatos/${blingContactId}`, blingToken, basicAuth, refreshTk); const contato = result.data?.data; const phone = contato?.telefone || contato?.celular;
    if (!phone) return { match: null, token: result.token }; const cleanPhone = phone.replace(/\D/g, "").slice(-9); if (cleanPhone.length < 8) return { match: null, token: result.token };
    const { data } = await supabase.from("contacts").select("id, full_name, phone, origin, origin_campaign, created_at").like("phone", `%${cleanPhone}%`).limit(1);
    if (data && data.length > 0) return { match: { ...data[0], method: "phone" }, token: result.token }; return { match: null, token: result.token };
  } catch { return { match: null, token: blingToken }; }
}

async function fastBackfill(supabase: SupabaseClient, orders: BlingOrder[], vendedoresMap: Map<number, string>, existingSet: Set<string>) {
  const newOrders = orders.filter(o => !existingSet.has(String(o.numero))); if (newOrders.length === 0) return { inserted: 0, errors: 0, error_details: [] as any[], cancelled: 0 };
  const cancelledCount = newOrders.filter(o => o.situacao?.id === SITUACAO_CANCELADO).length; const validOrders = newOrders.filter(o => o.situacao?.id !== SITUACAO_CANCELADO);
  const rows = validOrders.map(o => ({ pedido: String(o.numero), nome: o.contato.nome, valor: o.total, data_pedido: o.data, origem: "Pendente", campanha: null, data_entrada_crm: null, tempo_compra_dias: null, recebeu_disparo: false, dias_apos_disparo: null, comprou_apos_disparo: null, vendedor: (o.vendedor?.id && vendedoresMap.has(o.vendedor.id)) ? vendedoresMap.get(o.vendedor.id)! : "SEM VENDEDOR", sync_status: "pending_review", bling_id: o.id, match_method: null, contact_id: null, situacao_id: o.situacao?.id ?? null }));
  const batchSize = 50; let inserted = 0; const errorDetails: any[] = [];
  for (let i = 0; i < rows.length; i += batchSize) { const batch = rows.slice(i, i + batchSize); const { error } = await supabase.from("vendas_relatorio").insert(batch); if (error) { for (const row of batch) { const { error: singleErr } = await supabase.from("vendas_relatorio").insert(row); if (singleErr) errorDetails.push({ pedido: row.pedido, nome: row.nome, error: singleErr.message }); else inserted++; } } else { inserted += batch.length; } }
  return { inserted, errors: errorDetails.length, error_details: errorDetails, cancelled: cancelledCount };
}

async function completeBackfill(supabase: SupabaseClient, orders: BlingOrder[], vendedoresMap: Map<number, string>, existingMap: Map<string, string>, existingSet: Set<string>, currentToken: string, basicAuth: string, refreshTk: string) {
  const pendingPedidos = new Set<string>(); for (const [pedido, origem] of existingMap) { if (origem === "Pendente") pendingPedidos.add(pedido); }
  const cancelledOrders = orders.filter(o => o.situacao?.id === SITUACAO_CANCELADO); const cancelledCount = cancelledOrders.length;
  const cancelledPedidos = cancelledOrders.map(o => String(o.numero)).filter(p => existingSet.has(p));
  if (cancelledPedidos.length > 0) { for (let i = 0; i < cancelledPedidos.length; i += 50) { await supabase.from("vendas_relatorio").delete().in("pedido", cancelledPedidos.slice(i, i + 50)); } for (const p of cancelledPedidos) { existingSet.delete(p); existingMap.delete(p); } }
  const validOrders = orders.filter(o => o.situacao?.id !== SITUACAO_CANCELADO);
  const ordersToProcess = validOrders.filter(o => { const pedido = String(o.numero); return !existingSet.has(pedido) || pendingPedidos.has(pedido); });
  if (ordersToProcess.length === 0) return { inserted: 0, enriched: 0, pending: 0, reprocessed: 0, cancelled: cancelledCount, cancelled_removed: cancelledPedidos.length, errors: [] as any[], token: currentToken };
  const pendingToReprocess = ordersToProcess.map(o => String(o.numero)).filter(p => pendingPedidos.has(p));
  if (pendingToReprocess.length > 0) { for (let i = 0; i < pendingToReprocess.length; i += 50) { await supabase.from("vendas_relatorio").delete().in("pedido", pendingToReprocess.slice(i, i + 50)); } }
  const uniqueNames = [...new Set(ordersToProcess.map(o => o.contato.nome))]; const contactCache = await prefetchContacts(supabase, uniqueNames);
  const unmatchedOrders = ordersToProcess.filter(o => !contactCache.has(o.contato.nome.toLowerCase().trim()));
  for (const order of unmatchedOrders) { try { const phoneResult = await matchByPhone(supabase, currentToken, basicAuth, refreshTk, order.contato.id); currentToken = phoneResult.token; if (phoneResult.match) { contactCache.set(order.contato.nome.toLowerCase().trim(), phoneResult.match); } await new Promise(r => setTimeout(r, 50)); } catch {} }
  const matchedContactIds = [...new Set([...contactCache.values()].map(c => c.id))]; const fpCache = await prefetchOrigins(supabase, matchedContactIds); const disparoCache = await prefetchDisparos(supabase, matchedContactIds);
  const results = { inserted: 0, enriched: 0, pending: 0, errors: [] as any[] }; const rows: any[] = [];
  for (const order of ordersToProcess) {
    try {
      const wasReprocessed = pendingPedidos.has(String(order.numero)); const match = contactCache.get(order.contato.nome.toLowerCase().trim()) || null;
      let vendedorNome = "SEM VENDEDOR"; if (order.vendedor?.id && vendedoresMap.has(order.vendedor.id)) { vendedorNome = vendedoresMap.get(order.vendedor.id)!; }
      let origem = "Organico (sem origem)"; let campanha: string | null = null; let contactId: string | null = null; let dataEntradaCrm: string | null = null; let matchMethod: string | null = null; let syncStatus = "pending_review";
      if (match) { contactId = match.id; dataEntradaCrm = match.created_at?.split("T")[0] || null; matchMethod = match.method; syncStatus = match.method === "exact" ? "confirmed" : "review_match"; const fp = fpCache.get(match.id); if (fp) { origem = fp.origin; campanha = fp.campanha; if (vendedorNome === "SEM VENDEDOR" && fp.vendedor_crm) { vendedorNome = fp.vendedor_crm; } } }
      let recebeuDisparo = false; let diasAposDisparo: number | null = null; let comprouAposDisparo: string | null = null;
      if (match) { const disparo = disparoCache.get(match.id); if (disparo) { recebeuDisparo = true; const dias = Math.floor((new Date(order.data).getTime() - new Date(disparo.sent_at).getTime()) / 86400000); diasAposDisparo = dias; comprouAposDisparo = dias >= 0 ? "SIM" : "NAO"; } }
      const tempoCompra = dataEntradaCrm ? Math.floor((new Date(order.data).getTime() - new Date(dataEntradaCrm).getTime()) / 86400000) : null;
      rows.push({ pedido: String(order.numero), nome: order.contato.nome, valor: order.total, data_pedido: order.data, origem, campanha, data_entrada_crm: dataEntradaCrm, tempo_compra_dias: tempoCompra, recebeu_disparo: recebeuDisparo, dias_apos_disparo: diasAposDisparo, comprou_apos_disparo: comprouAposDisparo, vendedor: vendedorNome, sync_status: syncStatus, bling_id: order.id, match_method: matchMethod, contact_id: contactId, situacao_id: order.situacao?.id ?? null, _wasReprocessed: wasReprocessed });
    } catch (e: any) { results.errors.push({ pedido: order.numero, nome: order.contato.nome, error: e.message }); }
  }
  for (let i = 0; i < rows.length; i += 50) { const batch = rows.slice(i, i + 50); const cleanBatch = batch.map(({ _wasReprocessed, ...rest }) => rest); const { error } = await supabase.from("vendas_relatorio").insert(cleanBatch); if (error) { for (let j = 0; j < batch.length; j++) { const { _wasReprocessed, ...row } = batch[j]; const { error: singleErr } = await supabase.from("vendas_relatorio").insert(row); if (singleErr) { results.errors.push({ pedido: row.pedido, nome: row.nome, error: singleErr.message }); } else { if (_wasReprocessed) results.enriched++; else if (row.sync_status === "confirmed") results.inserted++; else results.pending++; } } } else { for (const row of batch) { if (row._wasReprocessed) results.enriched++; else if (row.sync_status === "confirmed") results.inserted++; else results.pending++; } } }
  return { ...results, reprocessed: pendingToReprocess.length, cancelled: cancelledCount, cancelled_removed: cancelledPedidos.length, token: currentToken };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let bodyParams: any = {}; try { if (req.method === "POST") { const text = await req.text(); if (text) bodyParams = JSON.parse(text); } } catch {}
  const now = new Date(); const defaultInicial = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];
  const dataInicial = bodyParams.dataInicial || defaultInicial; const dataFinal = bodyParams.dataFinal || now.toISOString().split("T")[0];
  const incluirTodasLojas = bodyParams.incluirTodasLojas === true; const modoRapido = bodyParams.modoRapido === true;
  const { data: logEntry } = await supabase.from("sync_vendas_log").insert({ status: "running" }).select("id").single(); const logId = logEntry?.id;
  try {
    const tokens = await getBlingTokens(supabase); let currentToken = tokens.token; _currentToken = currentToken;
    const vendResult = await fetchVendedoresMap(supabase, currentToken, tokens.basic_auth, tokens.refresh_token); const vendedoresMap = vendResult.map; currentToken = vendResult.token;
    const orderResult = await fetchBlingOrders(supabase, currentToken, tokens.basic_auth, tokens.refresh_token, dataInicial, dataFinal); const allOrders = orderResult.orders; currentToken = orderResult.token;
    const filteredOrders = incluirTodasLojas ? allOrders : allOrders.filter(o => !o.loja?.id || o.loja.id === 0);
    const { data: existing } = await supabase.from("vendas_relatorio").select("pedido, origem"); const existingMap = new Map((existing || []).map(e => [e.pedido, e.origem])); const existingSet = new Set((existing || []).map(e => e.pedido));
    if (modoRapido) {
      const fastResult = await fastBackfill(supabase, filteredOrders, vendedoresMap, existingSet);
      if (logId) { await supabase.from("sync_vendas_log").update({ status: "completed", completed_at: new Date().toISOString(), orders_fetched: allOrders.length, orders_new: fastResult.inserted + fastResult.errors, orders_matched: 0, orders_pending: fastResult.inserted, errors: fastResult.error_details }).eq("id", logId); }
      return new Response(JSON.stringify({ success: true, modo: "rapido", periodo: `${dataInicial} a ${dataFinal}`, fetched_total: allOrders.length, filtered_orders: filteredOrders.length, incluiu_todas_lojas: incluirTodasLojas, new_orders: fastResult.inserted + fastResult.errors, inserted: fastResult.inserted, pending_review: fastResult.inserted, cancelled: fastResult.cancelled, errors: fastResult.errors, error_details: fastResult.error_details }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const completeResult = await completeBackfill(supabase, filteredOrders, vendedoresMap, existingMap, existingSet, currentToken, tokens.basic_auth, tokens.refresh_token);
    if (logId) { await supabase.from("sync_vendas_log").update({ status: "completed", completed_at: new Date().toISOString(), orders_fetched: allOrders.length, orders_new: completeResult.inserted + completeResult.enriched + completeResult.pending, orders_matched: completeResult.inserted + completeResult.enriched, orders_pending: completeResult.pending, errors: completeResult.errors }).eq("id", logId); }
    return new Response(JSON.stringify({ success: true, modo: "completo", periodo: `${dataInicial} a ${dataFinal}`, fetched_total: allOrders.length, filtered_orders: filteredOrders.length, incluiu_todas_lojas: incluirTodasLojas, new_orders: completeResult.inserted + completeResult.pending, reprocessed: completeResult.reprocessed, inserted: completeResult.inserted, enriched: completeResult.enriched, pending_review: completeResult.pending, cancelled: completeResult.cancelled, cancelled_removed: completeResult.cancelled_removed, errors: completeResult.errors.length, error_details: completeResult.errors }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e: any) {
    if (logId) { await supabase.from("sync_vendas_log").update({ status: "error", completed_at: new Date().toISOString(), errors: [{ error: e.message }] }).eq("id", logId); }
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
