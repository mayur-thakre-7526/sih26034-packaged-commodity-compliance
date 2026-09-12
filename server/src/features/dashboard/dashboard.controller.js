import { supabase } from '../../config/supabase.js';

export const getDashboardOverview = async (req, res, next) => {
  try {
    // 1. Get total products
    const { count: totalProducts, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // 2. Get scans for aggregated stats (filtered by role)
    let query = supabase
      .from('scans')
      .select('*, products(product_name, brand_name)')
      .order('created_at', { ascending: false });

    if (req.user.role === 'inspector') {
      query = query.eq('user_id', req.user.id);
    }

    const { data: scans, error: scansError } = await query;

    if (scansError) throw scansError;

    // 3. Aggregate data
    let totalScans = 0;
    let compliantScans = 0;
    let nonCompliantScans = 0;
    const violations = {
      critical: 0,
      major: 0,
      minor: 0
    };
    
    // Recent activity over last 7 days setup
    const activityMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      activityMap[dateStr] = 0;
    }

    scans.forEach(scan => {
      totalScans++;

      // Daily activity logic
      const scanDateStr = new Date(scan.created_at).toISOString().split('T')[0];
      if (activityMap[scanDateStr] !== undefined) {
        activityMap[scanDateStr]++;
      }

      // Check compliance stats
      if (scan.status === 'completed' && scan.result?.compliance?.summary) {
        const summary = scan.result.compliance.summary;
        
        if (summary.overall_status === 'compliant') {
          compliantScans++;
        } else if (summary.overall_status === 'non_compliant') {
          nonCompliantScans++;
        }

        violations.critical += summary.critical || 0;
        violations.major += summary.major || 0;
        violations.minor += summary.minor || 0;
      }
    });

    // 4. Format recent scans
    const recentScans = scans.slice(0, 5).map(scan => ({
      id: scan.id,
      product_name: scan.products?.product_name || 'Unknown',
      brand_name: scan.products?.brand_name || 'Unknown',
      created_at: scan.created_at,
      status: scan.status,
      overall_status: scan.result?.compliance?.summary?.overall_status || null,
      critical: scan.result?.compliance?.summary?.critical || 0,
      major: scan.result?.compliance?.summary?.major || 0,
      minor: scan.result?.compliance?.summary?.minor || 0,
    }));

    // Convert activityMap to array
    const activity = Object.keys(activityMap).map(date => ({
      date,
      count: activityMap[date]
    }));

    res.json({
      total_scans: totalScans,
      compliant_scans: compliantScans,
      non_compliant_scans: nonCompliantScans,
      violations,
      total_products: totalProducts || 0,
      recent_scans: recentScans,
      activity
    });
  } catch (error) {
    next(error);
  }
};
