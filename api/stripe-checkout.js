// api/stripe-checkout.js
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Preços dos planos (em cêntimos)
const PLAN_PRICES = {
  essential: 9700, // €97
  premium: 19700   // €197
};

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { planType, voucherCode, userId } = req.body;

    // Validar planType
    if (!['essential', 'premium'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    // Verificar se usuário já tem assinatura ativa
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .single();

    if (existingSubscription) {
      return res.status(400).json({ error: 'User already has an active subscription' });
    }

    // Obter dados do usuário
    const { data: userData } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    let discountPercentage = 0;
    let voucherId = null;

    // Validar voucher se fornecido
    if (voucherCode) {
      const { data: voucher } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', voucherCode.toUpperCase())
        .eq('active', true)
        .single();

      if (!voucher) {
        return res.status(400).json({ error: 'Invalid voucher code' });
      }

      // Verificar se voucher é aplicável ao plano
      if (!voucher.applicable_plans.includes(planType)) {
        return res.status(400).json({ error: 'Voucher not applicable to this plan' });
      }

      // Verificar se voucher ainda é válido (datas)
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

      // Verificar se usuário já usou este voucher
      const { data: previousUse } = await supabase
        .from('voucher_uses')
        .select('id')
        .eq('voucher_id', voucher.id)
        .eq('user_id', userId)
        .single();

      if (previousUse) {
        return res.status(400).json({ error: 'You have already used this voucher' });
      }

      // Aplicar desconto
      if (voucher.discount_type === 'percentage') {
        discountPercentage = voucher.discount_value;
      } else {
        // Para desconto fixo, calcular percentual
        discountPercentage = (voucher.discount_value / (PLAN_PRICES[planType] / 100)) * 100;
      }

      voucherId = voucher.id;
    }

    // Criar ou recuperar Stripe Customer
    let customerId;
    const { data: existingCustomer } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .not('stripe_customer_id', 'is', null)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      customerId = existingCustomer.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: {
          supabase_user_id: userId
        }
      });
      customerId = customer.id;
    }

    // Preparar session params
    const sessionParams = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: planType === 'essential' ? 'BeautyBot Essencial' : 'BeautyBot Premium',
              description: planType === 'essential' 
                ? 'Chatbot IA para clínicas de estética - Plano Essencial'
                : 'Chatbot IA para clínicas de estética - Plano Premium',
            },
            unit_amount: PLAN_PRICES[planType],
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1
        }
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        user_id: userId,
        plan_type: planType,
        voucher_id: voucherId || '',
        voucher_code: voucherCode || ''
      }
    };

    // Adicionar desconto se houver voucher
    if (discountPercentage > 0) {
      const coupon = await stripe.coupons.create({
        percent_off: Math.round(discountPercentage),
        duration: 'once', // Aplicar apenas no primeiro pagamento
        name: `Voucher: ${voucherCode}`
      });

      sessionParams.discounts = [{
        coupon: coupon.id
      }];
    }

    // Criar Checkout Session
    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    });
  }
}
