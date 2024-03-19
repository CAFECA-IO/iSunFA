/* eslint-disable react/function-component-definition */

export default function MyComponent() {
  return (
    <section className="mt-20 flex w-800px max-w-full flex-col rounded-xl bg-secondaryBlue p-12 font-barlow shadow-xl max-md:mt-10 max-md:px-5">
      <div className="leading-51.92px text-5xl font-semibold tracking-tighter text-amber-400 max-md:max-w-full">
        Get In Touch
      </div>
      <div className="mt-2 font-medium tracking-normal text-white max-md:max-w-full">
        Our Staff will contact with you as soon as possible.
      </div>
      <div className="mt-12 flex gap-1 whitespace-nowrap pb-2 max-md:mt-10 max-md:flex-wrap">
        <div className="self-start font-medium tracking-normal text-white">Name</div>
        <div className="flex-auto text-red-400 max-md:max-w-full">*</div>
      </div>
      <div className="items-start justify-center whitespace-nowrap rounded border border-solid border-sky-950 bg-slate-600 px-4 py-2.5 text-xl leading-7 tracking-tight text-slate-400 max-md:max-w-full max-md:pr-5">
        example
      </div>
      <div className="mt-8 flex gap-1 whitespace-nowrap pb-2 max-md:flex-wrap">
        <div className="self-start font-medium tracking-normal text-white">E-Mail</div>
        <div className="flex-auto text-red-400 max-md:max-w-full">*</div>
      </div>
      <div className="items-start justify-center whitespace-nowrap rounded border border-solid border-sky-950 bg-slate-600 px-4 py-2.5 text-xl leading-7 tracking-tight text-slate-400 max-md:max-w-full max-md:pr-5">
        example
      </div>
      <div className="mt-8 font-medium tracking-normal text-white max-md:max-w-full">
        Phone Number
      </div>
      <div className="mt-2 items-start justify-center whitespace-nowrap rounded border border-solid border-sky-950 bg-slate-600 px-4 py-2.5 text-xl leading-7 tracking-tight text-slate-400 max-md:max-w-full max-md:pr-5">
        example
      </div>
      <div className="mt-8 flex gap-1 pb-2 max-md:flex-wrap">
        <div className="font-medium tracking-normal text-white">What go you want to say...</div>
        <div className="flex-auto text-red-400 max-md:max-w-full">*</div>
      </div>
      <div className="justify-center rounded border border-solid border-sky-950 bg-slate-600 px-3.5 py-2 text-xl leading-7 tracking-tight text-slate-400 max-md:max-w-full">
        Autosize height based on content lines
        <br />
        <br />
      </div>
      <div className="mt-8 flex justify-center gap-2 self-end whitespace-nowrap rounded-md bg-amber-400 px-6 py-2.5 font-semibold tracking-normal text-blue-950 max-md:px-5">
        <div>Submit</div>
        <img
          loading="lazy"
          src="https://cdn.builder.io/api/v1/image/assets/TEMP/3a06b56acae9973cbe89c34274ba3940cff29f74bbf07e2ea634bdd13e456ba7?apiKey=0e17b0b875f041659e186639705112b1&"
          className="my-auto aspect-square w-5 shrink-0"
          alt="Submit icon"
        />
      </div>
    </section>
  );
}

// interface ContactFormProps {
//   onSubmit: (formData: { name: string; email: string; phone: string; message: string }) => void;
// }

// const ContactForm: React.FC<ContactFormProps> = ({ onSubmit }) => {
//   const [formData, setFormData] = React.useState({
//     name: '',
//     email: '',
//     phone: '',
//     message: '',
//   });

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     onSubmit(formData);
//   };

//   return (
// <section className="flex flex-col p-12 mt-20 max-w-full shadow-xl bg-sky-950 rounded-md w-800px max-md:px-5 max-md:mt-10">
//   <h2 className="text-5xl font-semibold tracking-tighter text-amber-400 leading-51.92px max-md:max-w-full">
//         Get In Touch
//       </h2>
//       <p className="mt-2 font-medium tracking-normal text-white max-md:max-w-full">
//         Our Staff will contact with you as soon as possible.
//       </p>
//       <form onSubmit={handleSubmit}>
//         <div className="flex gap-1 pb-2 mt-12 whitespace-nowrap max-md:flex-wrap max-md:mt-10">
//           <label htmlFor="name" className="self-start font-medium tracking-normal text-white">
//             Name
//           </label>
//           <span className="flex-auto text-red-400 max-md:max-w-full">*</span>
//         </div>
//         <input
//           type="text"
//           id="name"
//           name="name"
//           placeholder="example"
//           value={formData.name}
//           onChange={handleChange}
//           required
//           className="justify-center items-start px-4 py-2.5 text-xl tracking-tight leading-7 whitespace-nowrap rounded border border-solid bg-slate-600 border-sky-950 text-slate-400 max-md:pr-5 max-md:max-w-full"
//         />
//         <div className="flex gap-1 pb-2 mt-8 whitespace-nowrap max-md:flex-wrap">
//           <label htmlFor="email" className="self-start font-medium tracking-normal text-white">
//             E-Mail
//           </label>
//           <span className="flex-auto text-red-400 max-md:max-w-full">*</span>
//         </div>
//         <input
//           type="email"
//           id="email"
//           name="email"
//           placeholder="example"
//           value={formData.email}
//           onChange={handleChange}
//           required
//           className="justify-center items-start px-4 py-2.5 text-xl tracking-tight leading-7 whitespace-nowrap rounded border border-solid bg-slate-600 border-sky-950 text-slate-400 max-md:pr-5 max-md:max-w-full"
//         />
//         <div className="mt-8">
//           <label
//             htmlFor="phone"
//             className="font-medium tracking-normal text-white max-md:max-w-full"
//           >
//             Phone Number
//           </label>
//         </div>
//         <input
//           type="tel"
//           id="phone"
//           name="phone"
//           placeholder="example"
//           value={formData.phone}
//           onChange={handleChange}
//           className="justify-center items-start px-4 py-2.5 mt-2 text-xl tracking-tight leading-7 whitespace-nowrap rounded border border-solid bg-slate-600 border-sky-950 text-slate-400 max-md:pr-5 max-md:max-w-full"
//         />
//         <div className="flex gap-1 pb-2 mt-8 max-md:flex-wrap">
//           <label htmlFor="message" className="font-medium tracking-normal text-white">
//             What do you want to say...
//           </label>
//           <span className="flex-auto text-red-400 max-md:max-w-full">*</span>
//         </div>
//         <textarea
//           id="message"
//           name="message"
//           placeholder="Autosize height based on content lines"
//           value={formData.message}
//           onChange={handleChange}
//           required
//           rows={3}
//           className="justify-center px-3.5 py-2 text-xl tracking-tight leading-7 rounded border border-solid bg-slate-600 border-sky-950 text-slate-400 max-md:max-w-full"
//         ></textarea>
//         <button
//           type="submit"
//           className="flex gap-2 justify-center self-end px-6 py-2.5 mt-8 font-semibold tracking-normal whitespace-nowrap bg-amber-400 rounded-md text-blue-950 max-md:px-5"
//         >
//           <span>Submit</span>
//           <img
//             loading="lazy"
//             src="https://cdn.builder.io/api/v1/image/assets/TEMP/3a06b56acae9973cbe89c34274ba3940cff29f74bbf07e2ea634bdd13e456ba7?apiKey=0e17b0b875f041659e186639705112b1&"
//             alt="Submit icon"
//             className="shrink-0 my-auto w-5 aspect-square"
//           />
//         </button>
//       </form>
//     </section>
//   );
// };

// export default ContactForm;
