import{j as r}from"./jsx-runtime-u17CrQMm.js";import{r as g}from"./iframe-CRyNqr96.js";import"./preload-helper-PPVm8Dsz.js";function i({columns:e,data:l,getRowKey:c,getRowProps:u,...p}){return r.jsxs("table",{...p,children:[r.jsx("thead",{children:r.jsx("tr",{children:e.map(a=>r.jsx("th",{children:a.header},a.key))})}),r.jsx("tbody",{children:l.map(a=>g.createElement("tr",{...u?.(a),key:c(a)},e.map(m=>r.jsx("td",{children:m.render(a)},m.key))))})]})}i.__docgenInfo={description:"",methods:[],displayName:"Table",props:{columns:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{\r
	key: string;\r
	header: ReactNode;\r
	render: (item: T) => ReactNode;\r
}`,signature:{properties:[{key:"key",value:{name:"string",required:!0}},{key:"header",value:{name:"ReactNode",required:!0}},{key:"render",value:{name:"signature",type:"function",raw:"(item: T) => ReactNode",signature:{arguments:[{type:{name:"T"},name:"item"}],return:{name:"ReactNode"}},required:!0}}]}}],raw:"TableColumn<T>[]"},description:""},data:{required:!0,tsType:{name:"Array",elements:[{name:"T"}],raw:"T[]"},description:""},getRowKey:{required:!0,tsType:{name:"signature",type:"function",raw:"(item: T) => Key",signature:{arguments:[{type:{name:"T"},name:"item"}],return:{name:"Key"}}},description:""},getRowProps:{required:!1,tsType:{name:"signature",type:"function",raw:`(\r
	item: T,\r
) => HTMLAttributes<HTMLTableRowElement> & { "data-testid"?: string }`,signature:{arguments:[{type:{name:"T"},name:"item"}],return:{name:"intersection",raw:'HTMLAttributes<HTMLTableRowElement> & { "data-testid"?: string }',elements:[{name:"HTMLAttributes",elements:[{name:"HTMLTableRowElement"}],raw:"HTMLAttributes<HTMLTableRowElement>"},{name:"signature",type:"object",raw:'{ "data-testid"?: string }',signature:{properties:[{key:"data-testid",value:{name:"string",required:!1}}]}}]}}},description:""}}};const y=[{id:1,name:"Alex Morgan",email:"alex@example.com"},{id:2,name:"Sam Rivera",email:"sam@example.com"},{id:3,name:"Jamie Chen",email:"jamie@example.com"}],d=[{key:"id",header:"ID",render:e=>e.id},{key:"name",header:"Name",render:e=>e.name},{key:"email",header:"Email",render:e=>e.email}],h={title:"Components/Table",component:i,args:{columns:d,data:y,getRowKey:e=>e.id,border:1,cellPadding:8,style:{borderCollapse:"collapse",width:"100%"}},argTypes:{columns:{control:!1},getRowKey:{control:!1},getRowProps:{control:!1}}},t={},n={args:{data:[]}},s={args:{columns:[...d.slice(0,2),{key:"contact",header:"Contact",render:e=>r.jsx("a",{href:`mailto:${e.email}`,children:e.email})}]}},o={args:{getRowProps:e=>({style:{backgroundColor:e.id%2===0?"#f0f4f8":void 0}})}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    data: []
  }
}`,...n.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    columns: [...columns.slice(0, 2), {
      key: "contact",
      header: "Contact",
      render: person => <a href={\`mailto:\${person.email}\`}>{person.email}</a>
    }]
  }
}`,...s.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    getRowProps: person => ({
      style: {
        backgroundColor: person.id % 2 === 0 ? "#f0f4f8" : undefined
      }
    })
  }
}`,...o.parameters?.docs?.source}}};const b=["Default","Empty","CustomCells","CustomRows"];export{s as CustomCells,o as CustomRows,t as Default,n as Empty,b as __namedExportsOrder,h as default};
