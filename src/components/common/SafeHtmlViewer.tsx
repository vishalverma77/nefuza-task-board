import React from 'react';
import DOMPurify from 'dompurify';
import { Box, Typography } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { normalizeDescription } from '../../services/uncurlApi';

interface SafeHtmlViewerProps {
  htmlContent?: unknown;
  emptyMessage?: string;
}

export const SafeHtmlViewer: React.FC<SafeHtmlViewerProps> = ({
  htmlContent,
  emptyMessage = 'No description available for this work item.'
}) => {
  const normalized = normalizeDescription(htmlContent);

  if (!normalized || normalized.trim() === '' || normalized === '<p><br></p>') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          bgcolor: 'action.hover',
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider',
          color: 'text.secondary',
          textAlign: 'center'
        }}
      >
        <DescriptionOutlinedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.6 }} />
        <Typography variant="body2">{emptyMessage}</Typography>
      </Box>
    );
  }

  // Sanitize HTML safely preserving standard formatting tags & links
  const sanitizedHtml = DOMPurify.sanitize(normalized, {
    ADD_ATTR: ['target', 'rel'],
  });

  return (
    <Box
      sx={{
        fontSize: '0.95rem',
        lineHeight: 1.6,
        '& h1, & h2, & h3, & h4, & h5, & h6': {
          mt: 2,
          mb: 1,
          fontWeight: 600,
          color: 'text.primary',
        },
        '& p': {
          mb: 1.5,
        },
        '& ul, & ol': {
          pl: 3,
          mb: 2,
        },
        '& li': {
          mb: 0.5,
        },
        '& code': {
          bgcolor: 'action.hover',
          px: 0.8,
          py: 0.2,
          borderRadius: 1,
          fontFamily: 'monospace',
          fontSize: '0.875em',
        },
        '& blockquote': {
          borderLeft: '4px solid',
          borderColor: 'primary.main',
          pl: 2,
          py: 0.5,
          my: 2,
          fontStyle: 'italic',
          bgcolor: 'action.hover',
          borderRadius: '0 8px 8px 0',
        },
        '& a': {
          color: 'primary.main',
          textDecoration: 'none',
          '&:hover': {
            textDecoration: 'underline',
          },
        },
        '& table': {
          width: '100%',
          borderCollapse: 'collapse',
          my: 2,
        },
        '& th, & td': {
          border: '1px solid',
          borderColor: 'divider',
          padding: '8px 12px',
          textAlign: 'left',
        },
        '& th': {
          bgcolor: 'action.hover',
          fontWeight: 600,
        },
      }}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
