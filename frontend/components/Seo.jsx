import Head from 'next/head';

export default function Seo({
  title = 'Hazel Glen Care — Compassionate Nursing & Home Care, Gauteng',
  description = 'Hazel Glen Care is an inclusive nursing agency in Boksburg, Gauteng — vetted registered nurses, dementia care and general home care, available 24/7.',
}) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <link rel="icon" type="image/png" href="/favicon.png" />
    </Head>
  );
}
