import React from 'react';
import { createRoot } from 'react-dom/client';
import QuizApp from './components/QuizApp';
import './app/globals.css';
const element=document.getElementById('quiz-root');
if(!element)throw new Error('Quiz container is missing.');
createRoot(element).render(<React.StrictMode><QuizApp/></React.StrictMode>);
