
import React from 'react';
import type { User } from 'firebase/auth';
import { GoogleLogoIcon } from './GoogleLogoIcon';

interface HomeScreenProps {
  onGetStarted: () => void;
  onLogin: () => void;
  currentUser: User | null;
}

interface FeatureSectionProps {
  number: string;
  title: string;
  description: string;
  visualSide: 'left' | 'right';
  iconName: string; // Google Material Symbol name
  imageSrc: string; // Added for actual image
  imageAlt: string; // Added for image accessibility
}

const FeatureSection: React.FC<FeatureSectionProps> = ({ number, title, description, visualSide, iconName, imageSrc, imageAlt }) => (
  <div className={`flex flex-col md:flex-row items-center gap-8 lg:gap-12 py-12 ${visualSide === 'right' ? 'md:flex-row-reverse' : ''}`}>
    <div className="md:w-1/2">
      <img 
        src={imageSrc} 
        alt={imageAlt} 
        className="w-full h-auto rounded-lg shadow-xl object-cover max-h-80 sm:max-h-96" 
        loading="lazy"
      />
    </div>
    <div className="md:w-1/2">
      <div className="flex items-center mb-4">
        <span className="material-symbols-outlined text-accent text-4xl mr-3">{iconName}</span>
        <span className="text-5xl font-extrabold text-accent/30 block">{number}</span>
      </div>
      <h3 className="text-3xl font-bold text-text-heading mb-4 ml-0 font-display">{title}</h3>
      <p className="text-text-muted leading-relaxed">{description}</p>
    </div>
  </div>
);

const PersonaBenefitCard: React.FC<{ title: string; icon: string; benefits: string[]; }> = ({ title, icon, benefits }) => (
  <div className="bg-panel p-6 rounded-lg shadow-lg flex flex-col text-center h-full">
    <span className="material-symbols-outlined text-accent text-5xl mx-auto mb-4">{icon}</span>
    <h4 className="text-xl font-bold text-text-heading mb-3 font-display">{title}</h4>
    <ul className="space-y-2 text-text-muted text-sm flex-grow">
      {benefits.map((benefit, index) => (
        <li key={index} className="flex items-start text-left">
          <span className="material-symbols-outlined text-accent/80 text-base mr-2 mt-0.5" style={{fontSize: '18px'}}>check_circle</span>
          <span>{benefit}</span>
        </li>
      ))}
    </ul>
  </div>
);


export const HomeScreen: React.FC<HomeScreenProps> = ({ onGetStarted, onLogin, currentUser }) => {
  
  const handleCtaClick = () => {
    if (currentUser) {
      onGetStarted();
    } else {
      onLogin();
    }
  }

  return (
    <div className="min-h-screen bg-base text-text-body flex flex-col items-center p-4 sm:p-6 lg:p-8 selection:bg-accent selection:text-white antialiased">
      <nav className="w-full max-w-6xl mx-auto py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
           <div className="w-9 h-9 bg-panel rounded-md flex items-center justify-center">
                <span className="material-symbols-outlined text-accent text-2xl">hub</span>
            </div>
          <span className="text-2xl font-bold text-text-heading font-display">Spec<span className="text-accent">Forge</span></span>
        </div>
        <button
          onClick={handleCtaClick}
          className="bg-accent text-white font-semibold rounded-md px-6 py-2.5 text-sm hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base focus:ring-accent transition-all flex items-center transform hover:scale-105"
        >
         {currentUser ? 'Go to App' : (
            <>
              <GoogleLogoIcon className="w-4 h-4 mr-2" />
              Login & Forge
            </>
          )}
        </button>
      </nav>

      <header className="text-center py-16 lg:py-24 w-full max-w-4xl mx-auto">
        {/* Main Hero Visual Added Here */}
        <div className="mb-12">
            <img 
                src="./assets/hero-visual.png" 
                alt="SpecForge transforming ideas into structured documents" 
                className="w-full max-w-xl mx-auto h-auto rounded-lg shadow-2xl object-contain"
                loading="lazy"
            />
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text-heading mb-6 leading-tight font-display">
          Create <span className="text-accent">Full Tech Specs</span><br/> in <span className="text-accent">Under 5 Minutes</span>
        </h1>
        <p className="text-lg sm:text-xl text-text-muted mb-4 max-w-2xl mx-auto">
          "Prompting is the new Coding."
        </p>
        <p className="text-lg sm:text-xl text-text-muted mb-8 max-w-2xl mx-auto">
          SpecForge is the easiest way to transform your raw app ideas into developer-ready documentation using AI.
        </p>
        <button
          onClick={onGetStarted}
          className="bg-accent text-white font-semibold rounded-lg px-10 py-4 text-lg hover:bg-accent-dark focus:outline-none focus:ring-4 focus:ring-accent/50 transition-all duration-150 ease-in-out transform hover:scale-105 shadow-xl hover:shadow-accent/40"
        >
          {currentUser ? 'Start Forging' : 'Forge Your First Spec'}
        </button>
        <p className="text-sm text-text-muted mt-4">No sign-up required to try. Instant AI power.</p>
      </header>

      <section className="w-full max-w-5xl mx-auto divide-y divide-panel">
        <FeatureSection 
          number="01"
          title="Submit Your Vision"
          description="Simply paste your app idea, concept notes, or desired features. Our AI understands your unstructured input and identifies the core requirements."
          visualSide="right"
          iconName="edit_note"
          imageSrc="./assets/feature1-input.png"
          imageAlt="Visual depicting easy idea input into SpecForge"
        />
        <FeatureSection 
          number="02"
          title="AI Crafts Your Documents"
          description="SpecForge's AI gets to work, generating comprehensive User Stories, Technical Requirements, potential Database Schemas, API endpoints, and more, all structured in clear Markdown."
          visualSide="left"
          iconName="smart_toy"
          imageSrc="./assets/feature2-ai-crafts.png"
          imageAlt="Visual of AI crafting documents in SpecForge"
        />
        <FeatureSection 
          number="03"
          title="Export Developer-Ready Specs"
          description="Review the AI-generated documentation, and with one click, copy or download it. Hand off high-quality, actionable specs to your development team and accelerate your build."
          visualSide="right"
          iconName="download_for_offline"
          imageSrc="./assets/feature3-export.png"
          imageAlt="Visual showing exporting developer-ready specs from SpecForge"
        />
      </section>

      <section className="py-16 lg:py-24 w-full max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-heading font-display">
            Built For Innovators Like <span className="text-accent">You</span>
          </h2>
          <p className="mt-4 text-lg text-text-muted max-w-3xl mx-auto">
            Whether you're a founder with a groundbreaking idea, a developer ready to build, or a product manager steering the ship, SpecForge is your AI co-pilot.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <PersonaBenefitCard 
            title="For the Founder"
            icon="rocket_launch"
            benefits={[
              "Quickly validate and iterate on ideas.",
              "Create professional docs for investors.",
              "Align your team with a clear vision."
            ]}
          />
          <PersonaBenefitCard 
            title="For the Developer"
            icon="code"
            benefits={[
              "Eliminate blank-page syndrome.",
              "Get a solid architectural baseline.",
              "Focus on building, not boilerplate writing."
            ]}
          />
          <PersonaBenefitCard 
            title="For the Product Manager"
            icon="assignment_turned_in"
            benefits={[
              "Draft comprehensive PRDs in minutes.",
              "Ensure consistency across documents.",
              "Seamlessly hand off specs to engineering."
            ]}
          />
        </div>
      </section>

      <section className="py-16 text-center bg-panel w-full mt-12 rounded-lg shadow-xl">
        <div className="max-w-3xl mx-auto px-4">
          <span className="material-symbols-outlined text-accent text-5xl mx-auto block">auto_awesome</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text-heading mt-6 mb-6 font-display">
            Go From Idea to Actionable Specs, Effortlessly.
          </h2>
          <p className="text-lg text-text-muted mb-10">
            Stop wrestling with documentation. Let AI do the heavy lifting so you can focus on building.
          </p>
          <button
            onClick={onGetStarted}
            className="bg-accent text-white font-semibold rounded-lg px-10 py-4 text-lg hover:bg-accent-dark focus:outline-none focus:ring-4 focus:ring-accent/50 transition-all duration-150 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-accent/30"
          >
            {currentUser ? 'Enter the Forge' : 'Forge Your Specs Now'}
          </button>
        </div>
      </section>

      <footer className="mt-20 py-8 text-center text-text-muted text-sm border-t border-panel w-full max-w-6xl mx-auto">
        <p>&copy; {new Date().getFullYear()} SpecForge. Streamlining your vision into reality.</p>
      </footer>
    </div>
  );
};
