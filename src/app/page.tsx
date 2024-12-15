import { Book, MessageSquare, Zap } from "lucide-react";

import { GradientBackground } from "@/components/gradient-background";
import ModernEnhancedChatUI from "@/components/modern-enhanced-chat-ui";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <GradientBackground />
      
      <div className="relative z-10">
        {/* Header Section */}
        <header className="px-6 pt-8 pb-16 sm:px-8 md:pt-12">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center gap-2 text-white/80">
              <Book className="h-6 w-6" />
              <span className="text-sm font-medium">Code Wizard</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 md:mb-16">
              <h1 className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
                Master LangChain with{' '}
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Code Wizard
                </span>
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-white/70">
                Your AI-powered assistant for understanding and using LangChain documentation effortlessly. Ask any question about LangChain concepts or code.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard 
                icon={<MessageSquare className="h-5 w-5" />}
                title="Interactive Documentation"
                description="Smart documentation search powered by LangGraph DAG and vector databases for precise information retrieval."
              />
              <FeatureCard 
                icon={<Zap className="h-5 w-5" />}
                title="Real-time Streaming"
                description="Get instant responses with our streaming architecture and efficient caching system."
              />
              <FeatureCard 
                icon={<Book className="h-5 w-5" />}
                title="Multiple Models"
                description="Switch between ChatOpenAI and local LLaMA models for flexible AI interactions."
              />
            </div>

            {/* Chat UI */}
            <div className="rounded-lg border border-white/10 bg-black/20 p-1 shadow-2xl backdrop-blur-xl">
              <ModernEnhancedChatUI />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="group relative rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:bg-white/10">
      <div className="mb-3 inline-block rounded-full bg-purple-500/10 p-2 text-purple-400">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold text-white">{title}</h3>
      <p className="text-sm text-white/70">{description}</p>
    </div>
  );
}