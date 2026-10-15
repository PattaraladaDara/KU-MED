"use client";

const nextFrame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));

export async function printWhenReady(){
  if(document.fonts){
    await Promise.allSettled([
      document.fonts.load('400 16px "TH Sarabun New"'),
      document.fonts.load('700 16px "TH Sarabun New"'),
      document.fonts.ready,
    ]);
  }
  await nextFrame();
  await nextFrame();
  window.print();
}
