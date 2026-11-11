import { useEffect } from 'react';
import { SpanBar } from '@/story/SpanBar';
import { Hero } from '@/story/Hero';
import { Arrive } from '@/story/chapters/Arrive';
import { History } from '@/story/chapters/History';
import { Tabby } from '@/story/chapters/Tabby';
import { House } from '@/story/chapters/House';
import { Habitats } from '@/story/chapters/Habitats';
import { Hogs } from '@/story/chapters/Hogs';
import { Donkeys } from '@/story/chapters/Donkeys';
import { Turtles } from '@/story/chapters/Turtles';
import { Journal } from '@/story/chapters/Journal';
import { Sources } from '@/story/Sources';
import { startStory } from '@/story/runtime';

/**
 * The whole page. The components render static markup; startStory() then wires the
 * charts, widgets, tooltips and progress bar onto it, once.
 */
export function Story() {
  useEffect(() => {
    startStory();
  }, []);

  return (
    <>
      <SpanBar />
      <main className="story" id="top">
        <Hero />
        <Arrive />
        <History />
        <Tabby />
        <House />
        <Habitats />
        <Hogs />
        <Donkeys />
        <Turtles />
        <Journal />
        <Sources />
      </main>
    </>
  );
}
