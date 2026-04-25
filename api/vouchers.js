// api/vouchers.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verificar autenticação
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Verificar se é admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, user.id, isAdmin);
    case 'POST':
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      return handleCreate(req, res, user.id);
    case 'PUT':
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      return handleUpdate(req, res);
    case 'DELETE':
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      return handleDelete(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// GET - Listar vouchers (admin vê todos, user apenas valida)
async function handleGet(req, res, userId, isAdmin) {
  const { code } = req.query;

  // Se tem code, validar voucher específico (qualquer usuário pode)
  if (code) {
    const { data: voucher, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('active', true)
      .single();

    if (error || !voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    // Verificar validade
    const now = new Date();
    const validFrom = new Date(voucher.valid_from);
    const validUntil = voucher.valid_until ? new Date(voucher.valid_until) : null;

    if (now < validFrom || (validUntil && now > validUntil)) {
      return res.status(400).json({ error: 'Voucher has expired or is not yet valid' });
    }

    // Verificar limite de uso
    if (voucher.max_uses !== null && voucher.current_uses >= voucher.max_uses) {
      return res.status(400).json({ error: 'Voucher usage limit reached' });
    }

    // Verificar se usuário já usou
    const { data: previousUse } = await supabase
      .from('voucher_uses')
      .select('id')
      .eq('voucher_id', voucher.id)
      .eq('user_id', userId)
      .single();

    if (previousUse) {
      return res.status(400).json({ error: 'You have already used this voucher' });
    }

    return res.status(200).json({
      valid: true,
      voucher: {
        code: voucher.code,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        applicable_plans: voucher.applicable_plans
      }
    });
  }

  // Listar todos (só admin)
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { data: vouchers, error } = await supabase
    .from('vouchers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch vouchers' });
  }

  return res.status(200).json({ vouchers });
}

// POST - Criar novo voucher (apenas admin)
async function handleCreate(req, res, userId) {
  const {
    code,
    discount_type,
    discount_value,
    max_uses,
    valid_from,
    valid_until,
    applicable_plans
  } = req.body;

  // Validações
  if (!code || !discount_type || !discount_value) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!['percentage', 'fixed'].includes(discount_type)) {
    return res.status(400).json({ error: 'Invalid discount type' });
  }

  if (discount_type === 'percentage' && (discount_value <= 0 || discount_value > 100)) {
    return res.status(400).json({ error: 'Percentage must be between 1 and 100' });
  }

  // Criar voucher
  const { data: voucher, error } = await supabase
    .from('vouchers')
    .insert({
      code: code.toUpperCase(),
      discount_type,
      discount_value,
      max_uses: max_uses || null,
      valid_from: valid_from || new Date().toISOString(),
      valid_until: valid_until || null,
      applicable_plans: applicable_plans || ['essential', 'premium'],
      created_by: userId
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Voucher code already exists' });
    }
    return res.status(500).json({ error: 'Failed to create voucher', details: error.message });
  }

  return res.status(201).json({ voucher });
}

// PUT - Atualizar voucher (apenas admin)
async function handleUpdate(req, res) {
  const { id, active, max_uses, valid_until } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Voucher ID required' });
  }

  const updateData = {};
  if (typeof active !== 'undefined') updateData.active = active;
  if (typeof max_uses !== 'undefined') updateData.max_uses = max_uses;
  if (valid_until) updateData.valid_until = valid_until;

  const { data: voucher, error } = await supabase
    .from('vouchers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: 'Failed to update voucher' });
  }

  return res.status(200).json({ voucher });
}

// DELETE - Deletar voucher (apenas admin)
async function handleDelete(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Voucher ID required' });
  }

  const { error } = await supabase
    .from('vouchers')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json({ error: 'Failed to delete voucher' });
  }

  return res.status(200).json({ success: true });
}
