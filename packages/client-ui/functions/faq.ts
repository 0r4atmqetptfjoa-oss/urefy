import { headHandler } from './_head.js';
import { renderLearnPage } from './_learn.js';
export const onRequestGet = () => renderLearnPage('faq');

export const onRequestHead = headHandler(onRequestGet);
