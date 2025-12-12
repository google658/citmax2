
import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

interface Story {
  id: number;
  title: string;
  thumbnail: string; // Color or Image URL
  contentImage: string;
  type: 'image' | 'video';
  duration: number; // seconds
  seen: boolean;
  category: 'promo' | 'warning' | 'tip';
}

const MOCK_STORIES: Story[] = [
  {
    id: 1,
    title: 'Manutenção',
    thumbnail: 'bg-yellow-500',
    contentImage: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2069&auto=format&fit=crop',
    type: 'image',
    duration: 5,
    seen: false,
    category: 'warning'
  },
  {
    id: 2,
    title: 'Paramount+',
    thumbnail: 'bg-blue-600',
    contentImage: 'https://images.unsplash.com/photo-1574375927938-d5a98e8efe85?q=80&w=2069&auto=format&fit=crop',
    type: 'image',
    duration: 5,
    seen: false,
    category: 'promo'
  },
  {
    id: 3,
    title: 'Dica Wi-Fi',
    thumbnail: 'bg-purple-600',
    contentImage: 'https://images.unsplash.com/photo-1563770095-39d468f9a51d?q=80&w=2070&auto=format&fit=crop',
    type: 'image',
    duration: 5,
    seen: false,
    category: 'tip'
  }
];

export const Stories: React.FC = () => {
  const [stories, setStories] = useState(MOCK_STORIES);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let interval: any;
    if (activeStoryIndex !== null && !isPaused) {
      const currentStory = stories[activeStoryIndex];
      const step = 100 / (currentStory.duration * 10); // Update every 100ms

      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            handleNext();
            return 0;
          }
          return prev + step;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [activeStoryIndex, isPaused]);

  const handleOpen = (index: number) => {
    setActiveStoryIndex(index);
    setProgress(0);
    setStories(prev => prev.map((s, i) => i === index ? { ...s, seen: true } : s));
  };

  const handleClose = () => {
    setActiveStoryIndex(null);
    setProgress(0);
  };

  const handleNext = () => {
    if (activeStoryIndex !== null && activeStoryIndex < stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
      setProgress(0);
      setStories(prev => prev.map((s, i) => i === activeStoryIndex + 1 ? { ...s, seen: true } : s));
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (activeStoryIndex !== null && activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
      setProgress(0);
    } else {
      setProgress(0); // Reset current
    }
  };

  return (
    <>
      {/* Stories Bar */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-1 scrollbar-hide">
        {stories.map((story, index) => (
          <button
            key={story.id}
            onClick={() => handleOpen(index)}
            className="flex flex-col items-center gap-1.5 shrink-0 group"
          >
            <div className={`w-16 h-16 rounded-full p-[2px] ${story.seen ? 'bg-slate-300 dark:bg-slate-700' : 'bg-gradient-to-tr from-[#00c896] to-[#036271]'}`}>
              <div className={`w-full h-full rounded-full border-2 border-slate-50 dark:border-[#01252b] ${story.thumbnail} overflow-hidden`}>
                 {/* Thumbnail Image or Color */}
                 {story.thumbnail.startsWith('http') && <img src={story.thumbnail} className="w-full h-full object-cover" />}
              </div>
            </div>
            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate w-16 text-center">
              {story.title}
            </span>
          </button>
        ))}
      </div>

      {/* Full Screen Viewer */}
      {activeStoryIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          
          {/* Main Container */}
          <div className="relative w-full h-full max-w-md bg-slate-900 md:rounded-xl overflow-hidden">
            
            {/* Progress Bar */}
            <div className="absolute top-4 left-2 right-2 z-20 flex gap-1">
              {stories.map((s, i) => (
                <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-100 ease-linear"
                    style={{ 
                      width: i < activeStoryIndex ? '100%' : i === activeStoryIndex ? `${progress}%` : '0%' 
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-8 left-4 right-4 z-20 flex justify-between items-center">
               <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${stories[activeStoryIndex].thumbnail}`}></div>
                  <span className="text-white font-bold text-sm shadow-black drop-shadow-md">{stories[activeStoryIndex].title}</span>
               </div>
               <button onClick={handleClose} className="p-2 text-white/80 hover:text-white">
                 <X className="w-6 h-6" />
               </button>
            </div>

            {/* Content */}
            <div 
              className="w-full h-full relative"
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
              onMouseDown={() => setIsPaused(true)}
              onMouseUp={() => setIsPaused(false)}
            >
               <img 
                 src={stories[activeStoryIndex].contentImage} 
                 className="w-full h-full object-cover"
                 alt="Story Content"
               />
               
               {/* Gradient Overlay for Text Readability */}
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20"></div>

               <div className="absolute bottom-20 left-6 right-6 text-white">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase mb-2 ${
                      stories[activeStoryIndex].category === 'warning' ? 'bg-yellow-500 text-black' :
                      stories[activeStoryIndex].category === 'promo' ? 'bg-blue-600' : 'bg-purple-600'
                  }`}>
                      {stories[activeStoryIndex].category === 'warning' ? 'Aviso' : stories[activeStoryIndex].category === 'promo' ? 'Novidade' : 'Dica'}
                  </span>
                  <h2 className="text-2xl font-bold font-['Righteous'] mb-2 drop-shadow-lg">
                      {stories[activeStoryIndex].category === 'warning' ? 'Manutenção na Rede' : stories[activeStoryIndex].category === 'promo' ? 'Canais Liberados!' : 'Melhore seu Wi-Fi'}
                  </h2>
                  <p className="text-sm opacity-90 drop-shadow-md">
                      {stories[activeStoryIndex].category === 'warning' ? 'Estamos realizando melhorias na sua região. Previsão de retorno às 14h.' : 
                       stories[activeStoryIndex].category === 'promo' ? 'Aproveite o sinal aberto dos canais Paramount neste fim de semana.' :
                       'Evite colocar o roteador dentro de móveis ou atrás da TV para melhor sinal.'}
                  </p>
               </div>
            </div>

            {/* Navigation Areas */}
            <div className="absolute inset-0 z-10 flex">
               <div className="w-1/3 h-full" onClick={handlePrev}></div>
               <div className="w-1/3 h-full" onClick={() => setIsPaused(!isPaused)}></div>
               <div className="w-1/3 h-full" onClick={handleNext}></div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
