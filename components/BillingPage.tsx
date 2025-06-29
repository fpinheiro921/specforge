
import React from 'react';

interface PlanFeatureProps {
  text: string;
  available: boolean;
}

const PlanFeature: React.FC<PlanFeatureProps> = ({ text, available }) => (
  <li className={`flex items-start ${available ? 'text-text-body' : 'text-text-muted line-through'}`}>
    <span className={`material-symbols-outlined text-base mr-2 mt-0.5 ${available ? 'text-accent' : 'text-text-muted'}`}>
      {available ? 'check_circle' : 'cancel'}
    </span>
    <span>{text}</span>
  </li>
);


interface PlanCardProps {
  title: string;
  price: string;
  priceDescription: string;
  description: string;
  features: PlanFeatureProps[];
  isCurrent?: boolean;
  isComingSoon?: boolean;
  ctaText: string;
  ctaAction?: () => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ title, price, priceDescription, description, features, isCurrent, isComingSoon, ctaText, ctaAction }) => {
  const cardClasses = `bg-base p-8 rounded-lg shadow-lg flex flex-col h-full border-2 ${isCurrent ? 'border-accent' : 'border-panel'}`;
  const ctaClasses = `w-full mt-auto py-3 px-6 rounded-md font-semibold text-center transition-colors duration-200 ${
    isCurrent
      ? 'bg-accent/20 text-accent cursor-default'
      : isComingSoon
      ? 'bg-panel hover:bg-accent/20 text-text-muted hover:text-accent cursor-pointer'
      : 'bg-accent text-white hover:bg-accent-dark'
  }`;

  return (
    <div className={cardClasses}>
      {isCurrent && (
        <span className="text-xs font-bold text-accent bg-accent/10 px-3 py-1 rounded-full self-start mb-4 -mt-2 -ml-2">
          Current Plan
        </span>
      )}
      {isComingSoon && (
         <span className="text-xs font-bold text-text-muted bg-panel/80 px-3 py-1 rounded-full self-start mb-4 -mt-2 -ml-2">
          Coming Soon
        </span>
      )}
      <h3 className="text-2xl font-bold text-text-heading font-display">{title}</h3>
      <p className="text-text-muted mt-1 mb-6">{description}</p>
      
      <div className="mb-6">
        <span className="text-4xl font-extrabold text-text-heading">{price}</span>
        <span className="text-text-muted ml-2">{priceDescription}</span>
      </div>

      <ul className="space-y-3 text-sm mb-8 flex-grow">
        {features.map((feature, index) => (
          <PlanFeature key={index} {...feature} />
        ))}
      </ul>
      
      <button onClick={ctaAction} className={ctaClasses} disabled={isCurrent}>
        {ctaText}
      </button>
    </div>
  );
};


export const BillingPage: React.FC = () => {
  const plans = [
    {
      title: 'Spark',
      price: '$0',
      priceDescription: '/ month',
      description: 'For individuals and students getting started with AI-powered specs.',
      features: [
        { text: '3 AI Generations / month', available: true },
        { text: 'All Documentation Modules', available: true },
        { text: 'Interactive Refinement Tools', available: true },
        { text: 'Cloud Storage & Sync', available: true },
        { text: 'Community Support', available: true },
        { text: 'AI-Powered Spec Analysis', available: false },
        { text: 'Team Collaboration', available: false },
      ],
      isCurrent: true,
      ctaText: 'You are on this plan',
    },
    {
      title: 'Pro',
      price: '$19',
      priceDescription: '/ month',
      description: 'For professionals and startups who need more power and advanced tools.',
      features: [
        { text: '40 AI Generations / month', available: true },
        { text: 'All features from Spark, plus...', available: true },
        { text: 'AI-Powered Spec Analysis', available: true },
        { text: 'Priority Email Support', available: true },
        { text: 'Access to new features in beta', available: true },
        { text: 'Team Collaboration', available: false },
      ],
      isComingSoon: true,
      ctaText: 'Notify Me When Live',
      ctaAction: () => alert('The "Pro" plan is coming soon! Check back for updates.'),
    },
    {
      title: 'Team',
      price: '$49',
      priceDescription: '/ month',
      description: 'For agencies and teams requiring collaboration and scale.',
      features: [
        { text: '150 AI Generations / month', available: true },
        { text: 'All features from Pro, plus...', available: true },
        { text: 'Team Collaboration (3 seats)', available: true },
        { text: 'Specification Version History', available: true },
        { text: 'Remove SpecForge Branding', available: true },
        { text: 'Dedicated Support Channel', available: true },
      ],
      isComingSoon: true,
      ctaText: 'Notify Me When Live',
      ctaAction: () => alert('The "Team" plan is coming soon! Check back for updates.'),
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold text-text-heading font-display">
          Find a Plan That's Right For <span className="text-accent">You</span>
        </h2>
        <p className="mt-4 text-lg text-text-muted max-w-3xl mx-auto">
          Start for free with our Spark plan. Paid plans with more generations and features are coming soon.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-stretch">
        {plans.map(plan => (
          <PlanCard key={plan.title} {...plan} />
        ))}
      </div>

       <div className="mt-12 bg-base/50 p-6 rounded-lg text-center border border-panel">
            <h4 className="font-bold text-text-heading">Questions?</h4>
            <p className="text-text-muted text-sm mt-2">
                For inquiries about enterprise solutions, custom plans, or the future roadmap, please reach out to our team.
                <br/>
                <a href="mailto:support@specforge.dev" className="text-accent hover:underline mt-2 inline-block">Contact Sales</a>
            </p>
        </div>
    </div>
  );
};
