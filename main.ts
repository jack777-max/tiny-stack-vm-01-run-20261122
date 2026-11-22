// Stack Forge: a tiny stack VM for make.fun tiny-stack-vm-01, a faithful table-driven
// interpreter of ISA.md v1. Reads /input/<id>/{program,input}.bin, writes
// /output/<id>/{stdout.bin,exit.txt}. Node 22, no dependencies.
// K[opcode] = imm*16 + pops*4 + pushes + 1 (0 = not an opcode), from the ISA's opcode table.
import{readdirSync,readFileSync,writeFileSync,mkdirSync}from'node:fs';
import{join}from'node:path';
const K=[1,18,66,5,7,11,12,16,0,0,0,0,0,0,0,0,10,10,10,10,10,10,10,6,10,10,10,6,10,10,10,0,10,10,10,0,0,0,0,0,0,0,0,0,0,0,0,0,33,37,37,33,1,0,0,0,0,0,0,0,0,0,0,0,6,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,2,5];
// Decoded once up front so the dispatch loop reads im/po/pu straight from tables
// instead of unpacking K's bit fields on every executed instruction.
const IM=new Int8Array(84),PO=new Int8Array(84),PU=new Int8Array(84);
for(let i=0;i<84;i++){const v=K[i]?K[i]-1:0;IM[i]=v>>4;PO[i]=v>>2&3;PU[i]=v&3}
function run(p,q){
 const D=new Int32Array(256),C=new Int32Array(64),M=new Int32Array(256),o=new Uint8Array(65536);
 let s=0,c=0,pc=0,st=0,ip=0,ol=0;const n=p.length;
 const T=x=>[o.slice(0,ol),x];
 for(;;){
  if(st===1e6)return T(10);
  if(pc<0||pc>=n)return T(9);
  const op=p[pc],k=K[op]||0;
  if(!k)return T(5);
  const im=IM[op],po=PO[op],pu=PU[op];
  if(pc+im>=n)return T(9);
  st++;const nx=pc+1+im;
  if(s<po)return T(2);
  if(s-po+pu>256)return T(3);
  pc=nx;
  switch(op){
   case 0:return T(0);
   case 1:D[s++]=(p[nx-1]<<24)>>24;break;
   case 2:D[s++]=p[nx-4]|p[nx-3]<<8|p[nx-2]<<16|p[nx-1]<<24;break;
   case 3:s--;break;
   case 4:D[s]=D[s-1];s++;break;
   case 5:{const t=D[s-1];D[s-1]=D[s-2];D[s-2]=t;break;}
   case 6:D[s]=D[s-2];s++;break;
   case 7:{const a=D[s-3];D[s-3]=D[s-2];D[s-2]=D[s-1];D[s-1]=a;break;}
   case 23:D[s-1]=-D[s-1]|0;break;
   case 27:D[s-1]=~D[s-1];break;
   case 48:case 49:case 50:{const r=(p[nx-2]|p[nx-1]<<8)<<16>>16;let t=1;if(op!==48){const v=D[--s];t=op===49?v===0:v!==0}if(t)pc=nx+r;break;}
   case 51:if(c===64)return T(7);C[c++]=nx;pc=p[nx-2]|p[nx-1]<<8;break;
   case 52:if(!c)return T(8);pc=C[--c];break;
   case 64:{const a=D[s-1];if(a<0||a>255)return T(6);D[s-1]=M[a];break;}
   case 65:{const a=D[s-1],v=D[s-2];if(a<0||a>255)return T(6);s-=2;M[a]=v;break;}
   case 80:{const t=String(D[s-1]);if(ol+t.length>65536)return T(11);s--;for(let i=0;i<t.length;i++)o[ol++]=t.charCodeAt(i);break;}
   case 81:if(ol+1>65536)return T(11);o[ol++]=D[--s]&255;break;
   case 82:D[s++]=ip<q.length?q[ip++]:-1;break;
   case 83:return T(D[--s]&255);
   default:{
    const b=D[s-1],a=D[s-2];let r;
    if(op<19)r=op===16?(a+b)|0:op===17?(a-b)|0:Math.imul(a,b);
    else if(op===19){if(!b)return T(4);r=a===-2147483648&&b===-1?a:(a/b)|0}
    else if(op===20){if(!b)return T(4);r=b===-1?0:a%b|0}
    else if(op===21){if(!b)return T(4);r=Math.floor((a>>>0)/(b>>>0))|0}
    else if(op===22){if(!b)return T(4);r=(a>>>0)%(b>>>0)|0}
    else if(op===24)r=a&b;
    else if(op===25)r=a|b;
    else if(op===26)r=a^b;
    else if(op===28)r=a<<(b&31);
    else if(op===29)r=a>>(b&31);
    else if(op===30)r=(a>>>(b&31))|0;
    else if(op===32)r=a===b?1:0;
    else if(op===33)r=a<b?1:0;
    else r=(a>>>0)<(b>>>0)?1:0;
    s-=2;D[s++]=r;
   }
  }
 }
}
const I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const d of readdirSync(I).sort()){
 const r=run(new Uint8Array(readFileSync(join(I,d,'program.bin'))),new Uint8Array(readFileSync(join(I,d,'input.bin'))));
 mkdirSync(join(O,d),{recursive:true});
 writeFileSync(join(O,d,'stdout.bin'),r[0]);
 writeFileSync(join(O,d,'exit.txt'),r[1]+'\n');
}
