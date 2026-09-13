import { supabase } from '../../config/supabase.js';
import PDFDocument from 'pdfkit';

export const createScan = async (req, res, next) => {
  try {
    const { product_id } = req.body;
    const files = req.files;

    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }

    // 1. Verify product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // 2. Validate image types
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    for (const file of files) {
      if (!validMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' });
      }
    }

    // 3. Create the scan record with status 'processing'
    const { data: scanRecord, error: scanInsertError } = await supabase
      .from('scans')
      .insert({
        product_id,
        user_id: req.user.id,
        image_urls: [], 
        status: 'processing',
        result: {}
      })
      .select()
      .single();

    if (scanInsertError) {
      throw scanInsertError;
    }

    const scanId = scanRecord.id;

    // 4. Upload images to Supabase Storage concurrently using privileged admin client
    const uploadResults = await Promise.all(
      files.map(async (file) => {
        const ext = file.originalname.split('.').pop() || 'jpg';
        const safeFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;
        const filePath = `${scanId}/${safeFilename}`;

        const { error: uploadError } = await supabase.storage
          .from('scans')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (uploadError) {
          return { error: uploadError, file, publicUrl: null };
        }

        const { data: publicUrlData } = supabase.storage.from('scans').getPublicUrl(filePath);
        return { error: null, file, publicUrl: publicUrlData.publicUrl };
      })
    );

    // Check if any upload failed
    const failedUpload = uploadResults.find((res) => res.error);
    if (failedUpload) {
      console.error('Supabase storage upload failed for', failedUpload.file.originalname, ':', failedUpload.error.message);
      await supabase
        .from('scans')
        .update({
          status: 'failed',
          result: { error: `Image upload failed: ${failedUpload.error.message}` }
        })
        .eq('id', scanId);

      return res.status(500).json({ error: `Image upload failed: ${failedUpload.error.message}` });
    }

    const imageUrls = uploadResults.map((res) => res.publicUrl);

    // Update scan with actual image URLs
    await supabase.from('scans').update({ image_urls: imageUrls }).eq('id', scanId);

    // 5. Send to Image Processing Service
    // Using a fallback URL if not set in .env
    const processingUrl = process.env.IMAGE_PROCESSING_URL || 'http://127.0.0.1:8000/scan';
    let result = null;
    let finalStatus = 'failed';

    try {
      const formData = new FormData();
      formData.append('scan_id', scanId);
      for (const file of files) {
        const blob = new Blob([file.buffer], { type: file.mimetype });
        formData.append('files', blob, file.originalname);
      }

      const response = await fetch(processingUrl, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(240000)
      });

      if (response.ok) {
        result = await response.json();
        finalStatus = 'completed';
      } else {
        const errText = await response.text();
        console.error('Image processing service returned non-OK status:', response.status, errText);
      }
    } catch (fetchError) {
      console.error('Image processing service error:', fetchError);
    }

    // 6. Save result and update status
    const { data: finalScan, error: updateError } = await supabase
      .from('scans')
      .update({
        result: result || {},
        status: finalStatus
      })
      .eq('id', scanId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.status(201).json(finalScan);

  } catch (error) {
    next(error);
  }
};

export const getScan = async (req, res, next) => {
  try {
    const { id } = req.params;

    let query = supabase
      .from('scans')
      .select('*')
      .eq('id', id);

    if (req.user.role === 'inspector') {
      query = query.eq('user_id', req.user.id);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      const err = new Error('Scan not found');
      err.statusCode = 404;
      throw err;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getScans = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    // Use inner join to force products to be returned so we can search on them
    let query = supabase
      .from('scans')
      .select('id, product_id, status, created_at, result, products!inner(product_name, brand_name)')
      .order('created_at', { ascending: false });

    if (req.user.role === 'inspector') {
      query = query.eq('user_id', req.user.id);
    }


    if (search) {
      query = query.or(`product_name.ilike.%${search}%,brand_name.ilike.%${search}%`, { foreignTable: 'products' });
    }

    if (status === 'compliant' || status === 'non_compliant') {
      query = query.eq('result->compliance->summary->>overall_status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Format response to flat schema as requested
    const formattedData = data.map((scan) => ({
      id: scan.id,
      product_id: scan.product_id,
      product_name: scan.products?.product_name,
      brand_name: scan.products?.brand_name,
      status: scan.status, 
      overall_status: scan.result?.compliance?.summary?.overall_status || null,
      created_at: scan.created_at
    }));

    res.json(formattedData);
  } catch (error) {
    next(error);
  }
};

export const getScanReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1 & 2 & 3 & 4. Fetch scan, product, user
    let query = supabase
      .from('scans')
      .select('*, products(product_name, brand_name, generic_name), users(name)')
      .eq('id', id);

    if (req.user.role === 'inspector') {
      query = query.eq('user_id', req.user.id);
    }

    const { data: scan, error: scanError } = await query.single();

    if (scanError || !scan) {
      const err = new Error('Scan not found');
      err.statusCode = 404;
      throw err;
    }

    if (scan.status === 'processing') {
      const err = new Error('Scan is still processing');
      err.statusCode = 400;
      throw err;
    }

    if (scan.status === 'failed' || !scan.result) {
      const err = new Error('Scan failed or is missing compliance result');
      err.statusCode = 400;
      throw err;
    }

    // 6. Generate PDF
    const doc = new PDFDocument({ margin: 50 });

    // 7. Return PDF via HTTP response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${id}.pdf"`);

    doc.pipe(res);

    // PDF 1. Report Header
    doc.fontSize(20).text('Legal Metrology Compliance Report', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Scan ID: ${scan.id}`);
    doc.text(`Scan Date: ${new Date(scan.created_at).toLocaleString()}`);
    doc.text(`Inspector Name: ${scan.users?.name || 'Unknown'}`);
    doc.moveDown();

    // PDF 2. Product Information
    doc.fontSize(16).text('Product Information', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Product Name: ${scan.products?.product_name || 'N/A'}`);
    doc.text(`Brand Name: ${scan.products?.brand_name || 'N/A'}`);
    doc.text(`Generic Name: ${scan.products?.generic_name || 'N/A'}`);
    doc.moveDown();

    // PDF 3. Compliance Summary
    const summary = scan.result.compliance?.summary || {};
    doc.fontSize(16).text('Compliance Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Overall Status: ${(summary.overall_status || 'Unknown').toUpperCase()}`);
    doc.text(`Critical Violations: ${summary.critical || 0}`);
    doc.text(`Major Violations: ${summary.major || 0}`);
    doc.text(`Minor Violations: ${summary.minor || 0}`);
    doc.moveDown();

    // PDF 4. Extracted Declarations
    const declarations = scan.result.declarations || {};
    doc.fontSize(16).text('Extracted Declarations', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    
    if (Object.keys(declarations).length === 0) {
      doc.text('No declarations extracted.');
    } else {
      for (const [key, rawValue] of Object.entries(declarations)) {
        const label = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        let value = 'Not detected';
        
        if (rawValue && typeof rawValue === 'object') {
          if (rawValue.value) {
            value = `${rawValue.value} ${rawValue.unit || ''}`.trim();
          } else if (rawValue.raw_text) {
            value = rawValue.raw_text;
          }
        } else if (rawValue !== null && rawValue !== undefined) {
          value = String(rawValue);
        }
        
        doc.text(`${label}: ${value}`);
      }
    }
    doc.moveDown();

    // PDF 5. Violations
    const violations = scan.result.compliance?.violations || [];
    doc.fontSize(16).text('Violations', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    
    if (violations.length === 0) {
      doc.text('No violations detected.');
    } else {
      violations.forEach((v, index) => {
        doc.text(`${index + 1}. [${(v.severity || 'Unknown').toUpperCase()}] ${v.code || 'UNKNOWN_CODE'}`);
        doc.text(`   Field: ${v.field || 'N/A'}`);
        doc.text(`   Message: ${v.message || 'No message provided.'}`);
        doc.moveDown(0.5);
      });
    }
    doc.moveDown();

    // PDF 6. Scanned Images
    if (scan.image_urls && scan.image_urls.length > 0) {
      doc.addPage();
      doc.fontSize(16).text('Scanned Images', { underline: true });
      doc.moveDown();

      for (const url of scan.image_urls) {
        try {
          const imgRes = await fetch(url);
          if (imgRes.ok) {
            const arrayBuffer = await imgRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            doc.image(buffer, { fit: [500, 400], align: 'center' });
            doc.moveDown();
          }
        } catch (imgError) {
          console.error(`Failed to load image for PDF: ${url}`, imgError);
          // Skip if fails
        }
      }
    }

    doc.end();

  } catch (error) {
    next(error);
  }
};
