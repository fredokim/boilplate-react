import { Button } from './Button';

type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ onPageChange, page, pageCount }: PaginationProps) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-2">
      <Button disabled={page <= 1} onClick={() => onPageChange(page - 1)} size="sm" variant="secondary">
        Prev
      </Button>
      {pages.map((item) => (
        <Button
          aria-current={item === page ? 'page' : undefined}
          key={item}
          onClick={() => onPageChange(item)}
          size="sm"
          variant={item === page ? 'primary' : 'secondary'}
        >
          {item}
        </Button>
      ))}
      <Button disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} size="sm" variant="secondary">
        Next
      </Button>
    </nav>
  );
}
