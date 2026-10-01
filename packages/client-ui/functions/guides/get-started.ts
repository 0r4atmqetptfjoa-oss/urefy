import { headHandler } from '../_head.js';
import { renderLearnPage } from '../_learn.js';
export const onRequestGet = () => renderLearnPage('get-started');

export const onRequestHead = headHandler(onRequestGet);
