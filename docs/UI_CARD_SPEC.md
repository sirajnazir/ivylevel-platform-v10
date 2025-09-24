# UI Card Specification - Reports Tab (v1.2.4)

## Overview

Add a "Reports" tab to the coach dashboard that displays opportunity analytics for each student.

## Component Structure

```jsx
<StudentProfile>
  <Tabs>
    <Tab name="Overview" />
    <Tab name="Weekly" />
    <Tab name="Reports" /> <!-- New -->
  </Tabs>
</StudentProfile>
```

## Reports Tab Layout

### 1. Opportunity Yield Card

```jsx
<Card title="Opportunity Performance by Category">
  <CardHeader>
    <h3>Overall Win Rate: {overallWinRate}%</h3>
    <p>{totalApplications} applications • {totalAccepted} accepted</p>
  </CardHeader>
  
  <CardBody>
    <CategoryChart data={categories} />
    
    <Table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Applied</th>
          <th>Accepted</th>
          <th>Win Rate</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {categories.map(cat => (
          <tr key={cat.category}>
            <td>{cat.category}</td>
            <td>{cat.total}</td>
            <td>{cat.accepted}</td>
            <td>{cat.win_rate_pct}%</td>
            <td>
              <Badge type={cat.win_rate_pct >= 80 ? 'success' : cat.win_rate_pct < 50 ? 'warning' : 'default'}>
                {cat.win_rate_pct >= 80 ? 'High Yield' : cat.win_rate_pct < 50 ? 'Challenging' : 'Moderate'}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  </CardBody>
</Card>
```

### 2. Temporal Patterns Card

```jsx
<Card title="Application Timeline & Patterns">
  <CardHeader>
    <div className="metrics-row">
      <Metric label="Bombardment Weeks" value={bombardmentWeeks} />
      <Metric label="Rejection Rebounds" value={rejectionRebounds} />
      <Metric label="Avg Rebound Time" value={avgReboundDays ? `${avgReboundDays} days` : 'N/A'} />
    </div>
  </CardHeader>
  
  <CardBody>
    <LineChart
      data={weeklyActivity}
      lines={[
        { key: 'applications', color: '#3B82F6', label: 'Applications' },
        { key: 'wins', color: '#10B981', label: 'Accepted' },
        { key: 'losses', color: '#EF4444', label: 'Rejected' }
      ]}
      xAxis="week_start"
    />
    
    <div className="insights">
      <h4>Key Insights</h4>
      <ul>
        {bombardmentWeeks > 0 && (
          <li>
            <strong>{bombardmentWeeks} bombardment weeks</strong> with {avgApplications} apps/week 
            achieved {avgWinRate}% win rate
          </li>
        )}
        {rejectionRebounds > 0 && (
          <li>
            <strong>{rejectionRebounds} successful rebounds</strong> from rejection to acceptance
          </li>
        )}
      </ul>
    </div>
  </CardBody>
</Card>
```

## Data Fetching

```typescript
// hooks/useReports.ts
export function useReports(studentId: string) {
  const { data: yieldReport, loading: yieldLoading } = useSWR(
    `/api/reports/${studentId}?type=yield`,
    fetcher
  );
  
  const { data: temporalReport, loading: temporalLoading } = useSWR(
    `/api/reports/${studentId}?type=temporal`,
    fetcher
  );
  
  return {
    yieldReport,
    temporalReport,
    loading: yieldLoading || temporalLoading
  };
}
```

## Visual Design

### Color Palette
- High Yield (80%+): `#10B981` (green)
- Moderate (50-80%): `#6B7280` (gray)
- Challenging (<50%): `#F59E0B` (amber)
- Bombardment weeks: `#3B82F6` (blue)

### Chart Specifications
1. **Category Chart**: Horizontal bar chart showing win rates
2. **Timeline Chart**: Multi-line chart with weekly granularity
3. **Responsive**: Stack charts on mobile, side-by-side on desktop

### Loading States
```jsx
<Skeleton height={400} /> // While data loads
```

### Empty States
```jsx
<EmptyState 
  icon={<ChartIcon />}
  title="No opportunity data yet"
  description="Reports will appear once students start applying to opportunities"
/>
```

## Interactions

1. **Hover**: Show detailed tooltips on charts
2. **Click**: Category rows expand to show individual opportunities
3. **Export**: Download button for CSV/PDF export
4. **Refresh**: Manual refresh button with loading indicator

## API Integration

```typescript
// pages/api/reports/[studentId].ts
export default async function handler(req, res) {
  const { studentId, type = 'yield' } = req.query;
  
  const response = await fetch(`${API_URL}/reports/${studentId}?type=${type}`);
  const data = await response.json();
  
  res.json(data);
}
```

## Accessibility

- ARIA labels for all charts
- Keyboard navigation for tables
- Screen reader announcements for data updates
- High contrast mode support

## Performance

- Cache reports for 1 hour
- Lazy load charts
- Virtualize long tables (>20 rows)
- Progressive enhancement (tables work without JS)

## Mobile Considerations

- Stack cards vertically
- Swipeable chart views
- Condensed table format
- Touch-friendly interactions