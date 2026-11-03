import {ArrowRight, ChefHat, Clock, MessageCircle, Sparkles} from 'lucide-react';
import type {Locale} from '@last-slice/contracts';

export const landingCopy = {
  'pt-BR': {
    brand: 'PIZZARIA ARTESANAL',
    photoLabel: 'DO SEU JEITO',
    photoSlogan: 'CADA ESCOLHA.\nUMA BOA FATIA.',
    ingredients: 'MUSSARELA · TOMATE · ORÉGANO',
    footer: 'PIZZARIA DEMONSTRATIVA',
    explore: 'Conheça os recursos',
    imageAlt: 'Pizza ilustrativa',
    title: 'The Last Slice — Monte sua pizza e explore a demonstração',
    description: 'Monte sua pizza com ajuda da IA, peça sugestões da semana e acompanhe o pedido na cozinha simulada. Sem pagamento ou entrega reais.',
    eyebrow: 'EXPLORE A DEMONSTRAÇÃO',
    heading: 'Da primeira escolha à última fatia.',
    intro: 'Escolha pelo cardápio ou conte com uma ajuda. Você decide cada passo do seu pedido demonstrativo.',
    features: [
      {title: 'Sua pizza, com ajuda da IA', description: 'Converse sobre sabores, massas e adicionais. O assistente prepara uma proposta; você revisa e só altera a sacola ao aplicar.', action: 'Conversar com o assistente'},
      {title: 'Uma sugestão para hoje', description: 'Peça uma indicação com base no seu gosto e nos pedidos fictícios concluídos nos últimos sete dias. Sem histórico, a ajuda vem do cardápio.', action: 'Pedir uma sugestão'},
      {title: 'Acompanhe cada etapa', description: 'Use o código do pedido para consultar o status e as etapas da simulação, da confirmação à conclusão.', action: 'Consultar meu pedido'},
      {title: 'Uma espiada na cozinha', description: 'Veja o quadro compartilhado de pedidos e a conversa da equipe fictícia enquanto a cozinha simulada trabalha.', action: 'Ver a cozinha simulada'},
    ],
  },
  'en-US': {
    brand: 'ARTISAN PIZZERIA',
    photoLabel: 'YOUR WAY',
    photoSlogan: 'EVERY CHOICE.\nA GREAT SLICE.',
    ingredients: 'MOZZARELLA · TOMATO · OREGANO',
    footer: 'DEMO PIZZERIA',
    explore: 'Explore the features',
    imageAlt: 'Illustrative pizza',
    title: 'The Last Slice — Build your pizza and explore the demo',
    description: 'Build your pizza with AI help, ask for weekly suggestions, and follow your order in the simulated kitchen. No real payment or delivery.',
    eyebrow: 'EXPLORE THE DEMO',
    heading: 'From the first choice to the last slice.',
    intro: 'Browse the menu or ask for a little help. You decide every step of your demo order.',
    features: [
      {title: 'Your pizza, with AI help', description: 'Chat about flavors, crusts, and extras. The assistant prepares a proposal; you review it and apply it to change your bag.', action: 'Chat with the assistant'},
      {title: 'A suggestion for today', description: 'Ask for a suggestion based on your taste and completed fictional orders from the last seven days. Without that history, help comes from the menu.', action: 'Ask for a suggestion'},
      {title: 'Follow every step', description: 'Use your order code to check its status and simulated stages, from confirmation to completion.', action: 'Look up my order'},
      {title: 'A peek into the kitchen', description: 'Watch the shared order board and fictional staff conversation as the simulated kitchen gets to work.', action: 'Watch the simulated kitchen'},
    ],
  },
};

const icons = [MessageCircle, Sparkles, Clock, ChefHat];

export function LandingFeatures({locale, onAssistant, onTrack}: {
  locale: Locale;
  onAssistant: () => void;
  onTrack: () => void;
}) {
  const t = landingCopy[locale];
  return <section className="landingFeatures" id="features" aria-labelledby="features-heading">
    <div className="featureHeading">
      <p className="eyebrow">{t.eyebrow}</p>
      <h2 id="features-heading">{t.heading}</h2>
      <p>{t.intro}</p>
    </div>
    <div className="featureGrid">
      {t.features.map((feature, index) => {
        const Icon = icons[index];
        return <article className="featureCard" key={index}>
          <Icon className="featureIcon" size={24} aria-hidden="true"/>
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
          {index === 3
            ? <a href="/kitchen">{feature.action}<ArrowRight size={16} aria-hidden="true"/></a>
            : <button type="button" onClick={index === 2 ? onTrack : onAssistant}>{feature.action}<ArrowRight size={16} aria-hidden="true"/></button>}
        </article>;
      })}
    </div>
  </section>;
}
