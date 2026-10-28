const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const nodemailer = require('nodemailer');
initializeApp();
const SMTP_HOST=defineSecret('SMTP_HOST');
const SMTP_PORT=defineSecret('SMTP_PORT');
const SMTP_USER=defineSecret('SMTP_USER');
const SMTP_PASS=defineSecret('SMTP_PASS');
const SUPPORT_EMAIL='karinevitoriasousa6@gmail.com';
function mailer(){return nodemailer.createTransport({host:SMTP_HOST.value(),port:Number(SMTP_PORT.value()||587),secure:Number(SMTP_PORT.value())===465,auth:{user:SMTP_USER.value(),pass:SMTP_PASS.value()}})}
function safe(s){return String(s||'').replace(/[<>]/g,'')}
exports.notifySupportRequest = onDocumentCreated({document:'users/{uid}/supportRequests/{requestId}',secrets:[SMTP_HOST,SMTP_PORT,SMTP_USER,SMTP_PASS],region:'southamerica-east1'},async event=>{
 const d=event.data?.data(); if(!d)return; const transport=mailer(); const protocol=safe(d.protocol||event.params.requestId);
 await transport.sendMail({from:`ComfortStudy Suporte <${SMTP_USER.value()}>`,to:SUPPORT_EMAIL,replyTo:d.email||undefined,subject:`[ComfortStudy ${protocol}] ${safe(d.category)}: ${safe(d.subject)}`,text:`Nova solicitação de suporte
Protocolo: ${protocol}
Categoria: ${safe(d.category)}
Assunto: ${safe(d.subject)}
Estudante: ${safe(d.email)}
UID: ${safe(event.params.uid)}

Descrição:
${safe(d.description)}`});
 if(d.email) await transport.sendMail({from:`ComfortStudy Suporte <${SMTP_USER.value()}>`,to:d.email,subject:`Recebemos sua solicitação ${protocol}`,text:`Olá! Recebemos sua solicitação de suporte no ComfortStudy.

Protocolo: ${protocol}
Categoria: ${safe(d.category)}
Assunto: ${safe(d.subject)}
Status: Recebido

As atualizações serão enviadas para este e-mail. Não responda com senhas ou códigos de acesso.

Equipe ComfortStudy`});
});
exports.notifySupportStatusChange = onDocumentUpdated({document:'users/{uid}/supportRequests/{requestId}',secrets:[SMTP_HOST,SMTP_PORT,SMTP_USER,SMTP_PASS],region:'southamerica-east1'},async event=>{
 const before=event.data?.before.data(), after=event.data?.after.data(); if(!before||!after||before.status===after.status&&before.latestMessage===after.latestMessage)return; if(!after.email)return;
 const labels={received:'Recebido',in_review:'Em análise',answered:'Respondido',closed:'Concluído'}; const protocol=safe(after.protocol||event.params.requestId);
 await mailer().sendMail({from:`ComfortStudy Suporte <${SMTP_USER.value()}>`,to:after.email,subject:`Atualização da solicitação ${protocol}`,text:`Olá! Sua solicitação ${protocol} teve uma atualização.

Status: ${labels[after.status]||safe(after.status)}
${after.latestMessage?`Mensagem: ${safe(after.latestMessage)}
`:''}
Para dúvidas, escreva para ${SUPPORT_EMAIL}.`});
});
